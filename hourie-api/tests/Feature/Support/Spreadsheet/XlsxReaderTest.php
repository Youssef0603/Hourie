<?php

use App\Support\Spreadsheet\XlsxReader;

/**
 * @param  array<string, string>  $extraEntries
 */
function createTestWorkbook(string $sheetXml, array $extraEntries = []): string
{
    $path = tempnam(sys_get_temp_dir(), 'hourie-xlsx-');
    $archive = new ZipArchive;
    $archive->open($path, ZipArchive::OVERWRITE);
    $archive->addFromString('xl/workbook.xml', <<<'XML'
<?xml version="1.0" encoding="UTF-8"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets>
</workbook>
XML);
    $archive->addFromString('xl/_rels/workbook.xml.rels', <<<'XML'
<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Target="worksheets/sheet1.xml" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet"/>
</Relationships>
XML);
    $archive->addFromString('xl/worksheets/sheet1.xml', $sheetXml);

    foreach ($extraEntries as $name => $contents) {
        $archive->addFromString($name, $contents);
    }

    $archive->close();

    return $path;
}

function worksheetWithRows(string $rows): string
{
    return '<?xml version="1.0" encoding="UTF-8"?>'
        .'<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
        .'<sheetData>'.$rows.'</sheetData></worksheet>';
}

it('reads a normal workbook within the safety limits', function () {
    $path = createTestWorkbook(worksheetWithRows(
        '<row r="1"><c r="A1" t="inlineStr"><is><t>Code</t></is></c></row>',
    ));

    try {
        expect((new XlsxReader)->rows($path, 'Sheet1'))->toBe([1 => ['A' => 'Code']]);
    } finally {
        unlink($path);
    }
});

it('rejects workbooks with too many rows', function () {
    $rows = implode('', array_map(
        fn (int $row): string => '<row r="'.$row.'"><c r="A'.$row.'"><v>1</v></c></row>',
        range(1, 5001),
    ));
    $path = createTestWorkbook(worksheetWithRows($rows));

    try {
        expect(fn () => (new XlsxReader)->rows($path, 'Sheet1'))
            ->toThrow(RuntimeException::class, 'plus de 5000 lignes');
    } finally {
        unlink($path);
    }
});

it('rejects rows with too many cells', function () {
    $cells = '';

    foreach (range(1, 51) as $index) {
        $cells .= '<c r="A'.$index.'"><v>1</v></c>';
    }

    $path = createTestWorkbook(worksheetWithRows('<row r="1">'.$cells.'</row>'));

    try {
        expect(fn () => (new XlsxReader)->rows($path, 'Sheet1'))
            ->toThrow(RuntimeException::class, 'plus de 50 cellules');
    } finally {
        unlink($path);
    }
});

it('rejects oversized cell text', function () {
    $value = str_repeat('a', 2001);
    $path = createTestWorkbook(worksheetWithRows(
        '<row r="1"><c r="A1" t="inlineStr"><is><t>'.$value.'</t></is></c></row>',
    ));

    try {
        expect(fn () => (new XlsxReader)->rows($path, 'Sheet1'))
            ->toThrow(RuntimeException::class, '2000 caractères');
    } finally {
        unlink($path);
    }
});

it('rejects an oversized decompressed archive entry before reading it', function () {
    $path = createTestWorkbook(
        worksheetWithRows(''),
        ['xl/oversized.xml' => str_repeat('a', (25 * 1024 * 1024) + 1)],
    );

    try {
        expect(fn () => (new XlsxReader)->rows($path, 'Sheet1'))
            ->toThrow(RuntimeException::class, 'décompressé est trop volumineux');
    } finally {
        unlink($path);
    }
});

it('rejects document type declarations in workbook XML', function () {
    $path = createTestWorkbook(
        '<?xml version="1.0"?><!DOCTYPE worksheet [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>'
        .'<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData/></worksheet>',
    );

    try {
        expect(fn () => (new XlsxReader)->rows($path, 'Sheet1'))
            ->toThrow(RuntimeException::class, 'incomplet ou invalide');
    } finally {
        unlink($path);
    }
});

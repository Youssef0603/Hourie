<?php

namespace App\Support\Spreadsheet;

use DOMDocument;
use DOMElement;
use DOMXPath;
use RuntimeException;
use ZipArchive;

class XlsxReader
{
    /**
     * @return array<int, array<string, string|null>>
     */
    public function rows(string $path, string $sheetName): array
    {
        $archive = new ZipArchive;

        if ($archive->open($path) !== true) {
            throw new RuntimeException(__('imports.errors.open_file'));
        }

        try {
            $sharedStrings = $this->sharedStrings($archive);
            $worksheetPath = $this->worksheetPath($archive, $sheetName);
            $worksheet = $this->xml($this->entry($archive, $worksheetPath));
            $xpath = new DOMXPath($worksheet);
            $xpath->registerNamespace('main', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main');
            $rows = [];

            foreach ($xpath->query('//main:sheetData/main:row') ?: [] as $rowNode) {
                if (! $rowNode instanceof DOMElement) {
                    continue;
                }

                $rowNumber = (int) $rowNode->getAttribute('r');
                $cells = [];

                foreach ($xpath->query('main:c', $rowNode) ?: [] as $cell) {
                    if (! $cell instanceof DOMElement) {
                        continue;
                    }

                    preg_match('/^[A-Z]+/', $cell->getAttribute('r'), $columnMatch);
                    $column = $columnMatch[0] ?? '';

                    if ($column === '') {
                        continue;
                    }

                    $cells[$column] = $this->cellValue($xpath, $cell, $sharedStrings);
                }

                if ($cells !== []) {
                    $rows[$rowNumber] = $cells;
                }
            }

            return $rows;
        } finally {
            $archive->close();
        }
    }

    /**
     * @return array<int, string>
     */
    private function sharedStrings(ZipArchive $archive): array
    {
        $contents = $archive->getFromName('xl/sharedStrings.xml');

        if ($contents === false) {
            return [];
        }

        $document = $this->xml($contents);
        $xpath = new DOMXPath($document);
        $xpath->registerNamespace('main', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main');
        $strings = [];

        foreach ($xpath->query('//main:si') ?: [] as $stringNode) {
            $parts = [];

            foreach ($xpath->query('.//main:t', $stringNode) ?: [] as $textNode) {
                $parts[] = $textNode->textContent;
            }

            $strings[] = implode('', $parts);
        }

        return $strings;
    }

    private function worksheetPath(ZipArchive $archive, string $sheetName): string
    {
        $workbook = $this->xml($this->entry($archive, 'xl/workbook.xml'));
        $workbookXPath = new DOMXPath($workbook);
        $workbookXPath->registerNamespace('main', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main');
        $relationshipId = null;

        foreach ($workbookXPath->query('//main:sheets/main:sheet') ?: [] as $sheet) {
            if ($sheet instanceof DOMElement && $sheet->getAttribute('name') === $sheetName) {
                $relationshipId = $sheet->getAttributeNS(
                    'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
                    'id',
                );
                break;
            }
        }

        if ($relationshipId === null || $relationshipId === '') {
            throw new RuntimeException(__('imports.errors.sheet_missing', ['sheet' => $sheetName]));
        }

        $relationships = $this->xml($this->entry($archive, 'xl/_rels/workbook.xml.rels'));
        $relationshipsXPath = new DOMXPath($relationships);
        $relationshipsXPath->registerNamespace(
            'rel',
            'http://schemas.openxmlformats.org/package/2006/relationships',
        );

        foreach ($relationshipsXPath->query('//rel:Relationship') ?: [] as $relationship) {
            if ($relationship instanceof DOMElement && $relationship->getAttribute('Id') === $relationshipId) {
                $target = ltrim($relationship->getAttribute('Target'), '/');

                return str_starts_with($target, 'xl/') ? $target : 'xl/'.$target;
            }
        }

        throw new RuntimeException(__('imports.errors.sheet_missing', ['sheet' => $sheetName]));
    }

    /**
     * @param  array<int, string>  $sharedStrings
     */
    private function cellValue(DOMXPath $xpath, DOMElement $cell, array $sharedStrings): ?string
    {
        $type = $cell->getAttribute('t');

        if ($type === 'inlineStr') {
            $parts = [];

            foreach ($xpath->query('.//main:is//main:t', $cell) ?: [] as $textNode) {
                $parts[] = $textNode->textContent;
            }

            return implode('', $parts);
        }

        $valueNode = $xpath->query('main:v', $cell)?->item(0);

        if ($valueNode === null) {
            return null;
        }

        $value = $valueNode->textContent;

        if ($type === 's') {
            return $sharedStrings[(int) $value] ?? null;
        }

        return $value;
    }

    private function entry(ZipArchive $archive, string $path): string
    {
        $contents = $archive->getFromName($path);

        if ($contents === false) {
            throw new RuntimeException(__('imports.errors.invalid_workbook'));
        }

        return $contents;
    }

    private function xml(string $contents): DOMDocument
    {
        $document = new DOMDocument;

        if (! $document->loadXML($contents, LIBXML_NONET | LIBXML_NOBLANKS)) {
            throw new RuntimeException(__('imports.errors.invalid_workbook'));
        }

        return $document;
    }
}

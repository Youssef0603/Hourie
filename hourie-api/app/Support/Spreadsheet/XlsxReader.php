<?php

namespace App\Support\Spreadsheet;

use DOMDocument;
use DOMElement;
use DOMXPath;
use RuntimeException;
use ZipArchive;

class XlsxReader
{
    private const MAX_ARCHIVE_ENTRIES = 256;

    private const MAX_ARCHIVE_UNCOMPRESSED_BYTES = 50 * 1024 * 1024;

    private const MAX_ENTRY_UNCOMPRESSED_BYTES = 25 * 1024 * 1024;

    private const MAX_ROWS = 5000;

    private const MAX_CELLS_PER_ROW = 50;

    private const MAX_CELL_CHARACTERS = 2000;

    private const MAX_SHARED_STRINGS = 100000;

    private const MAX_SHARED_STRING_CHARACTERS = 5_000_000;

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
            $this->validateArchive($archive);
            $sharedStrings = $this->sharedStrings($archive);
            $worksheetPath = $this->worksheetPath($archive, $sheetName);
            $worksheet = $this->xml($this->entry($archive, $worksheetPath));
            $xpath = new DOMXPath($worksheet);
            $xpath->registerNamespace('main', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main');
            $rows = [];
            $rowCount = 0;

            foreach ($xpath->query('//main:sheetData/main:row') ?: [] as $rowNode) {
                if (! $rowNode instanceof DOMElement) {
                    continue;
                }

                $rowCount++;

                if ($rowCount > self::MAX_ROWS) {
                    throw new RuntimeException(__('imports.errors.too_many_rows', ['max' => self::MAX_ROWS]));
                }

                $rowNumber = (int) $rowNode->getAttribute('r');
                $cells = [];
                $cellNodes = $xpath->query('main:c', $rowNode);

                if ($cellNodes !== false && $cellNodes->length > self::MAX_CELLS_PER_ROW) {
                    throw new RuntimeException(__('imports.errors.too_many_cells', ['max' => self::MAX_CELLS_PER_ROW]));
                }

                foreach ($cellNodes ?: [] as $cell) {
                    if (! $cell instanceof DOMElement) {
                        continue;
                    }

                    preg_match('/^[A-Z]+/', $cell->getAttribute('r'), $columnMatch);
                    $column = $columnMatch[0] ?? '';

                    if ($column === '') {
                        continue;
                    }

                    $cells[$column] = $this->validatedCellValue($this->cellValue($xpath, $cell, $sharedStrings));
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
        $totalCharacters = 0;

        foreach ($xpath->query('//main:si') ?: [] as $stringNode) {
            if (count($strings) >= self::MAX_SHARED_STRINGS) {
                throw new RuntimeException(__('imports.errors.too_many_shared_strings'));
            }

            $parts = [];

            foreach ($xpath->query('.//main:t', $stringNode) ?: [] as $textNode) {
                $parts[] = $textNode->textContent;
            }

            $value = $this->validatedCellValue(implode('', $parts));
            $totalCharacters += mb_strlen($value ?? '');

            if ($totalCharacters > self::MAX_SHARED_STRING_CHARACTERS) {
                throw new RuntimeException(__('imports.errors.shared_strings_too_large'));
            }

            $strings[] = $value ?? '';
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
                $target = str_replace('\\', '/', ltrim($relationship->getAttribute('Target'), '/'));
                $path = str_starts_with($target, 'xl/') ? $target : 'xl/'.$target;

                if (str_contains($path, '../') || preg_match('#^xl/worksheets/[^/]+\.xml$#', $path) !== 1) {
                    throw new RuntimeException(__('imports.errors.invalid_workbook'));
                }

                return $path;
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

    private function validatedCellValue(?string $value): ?string
    {
        if ($value !== null && mb_strlen($value) > self::MAX_CELL_CHARACTERS) {
            throw new RuntimeException(__('imports.errors.cell_too_long', ['max' => self::MAX_CELL_CHARACTERS]));
        }

        return $value;
    }

    private function validateArchive(ZipArchive $archive): void
    {
        if ($archive->numFiles > self::MAX_ARCHIVE_ENTRIES) {
            throw new RuntimeException(__('imports.errors.archive_too_large'));
        }

        $totalUncompressedBytes = 0;

        for ($index = 0; $index < $archive->numFiles; $index++) {
            $entry = $archive->statIndex($index);

            if ($entry === false) {
                throw new RuntimeException(__('imports.errors.invalid_workbook'));
            }

            $name = str_replace('\\', '/', (string) ($entry['name'] ?? ''));
            $size = (int) ($entry['size'] ?? 0);

            if ($name === '' || str_starts_with($name, '/') || in_array('..', explode('/', $name), true)) {
                throw new RuntimeException(__('imports.errors.invalid_workbook'));
            }

            if ((int) ($entry['encryption_method'] ?? 0) !== 0) {
                throw new RuntimeException(__('imports.errors.invalid_workbook'));
            }

            if ($size > self::MAX_ENTRY_UNCOMPRESSED_BYTES) {
                throw new RuntimeException(__('imports.errors.archive_too_large'));
            }

            $totalUncompressedBytes += $size;

            if ($totalUncompressedBytes > self::MAX_ARCHIVE_UNCOMPRESSED_BYTES) {
                throw new RuntimeException(__('imports.errors.archive_too_large'));
            }
        }
    }

    private function xml(string $contents): DOMDocument
    {
        if (stripos($contents, '<!DOCTYPE') !== false) {
            throw new RuntimeException(__('imports.errors.invalid_workbook'));
        }

        $document = new DOMDocument;
        $previousErrorHandling = libxml_use_internal_errors(true);

        try {
            $loaded = $document->loadXML($contents, LIBXML_NONET | LIBXML_NOBLANKS);
        } finally {
            libxml_clear_errors();
            libxml_use_internal_errors($previousErrorHandling);
        }

        if (! $loaded) {
            throw new RuntimeException(__('imports.errors.invalid_workbook'));
        }

        return $document;
    }
}

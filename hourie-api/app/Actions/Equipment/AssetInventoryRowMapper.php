<?php

namespace App\Actions\Equipment;

/** Maps legacy asset-inventory spreadsheet rows to equipment attributes. */
class AssetInventoryRowMapper
{
    /** @param array<string, string|null> $row */
    public function isInventoryRow(int $rowNumber, array $row): bool
    {
        return $rowNumber > 5 && $this->text($row['E'] ?? null) !== null;
    }

    /** @param array<string, string|null> $row @return array<string, mixed> */
    public function map(array $row): array
    {
        $type = $this->text($row['E'] ?? null);
        $typeLower = mb_strtolower((string) $type);
        $categoryCode = match (true) {
            $typeLower === 'generator' => 'generator',
            $typeLower === 'mobile crane' => 'tower_crane',
            $this->text($row['B'] ?? null) === 'Formwork' => 'formwork_scaffolding',
            in_array($typeLower, ['car', 'utility car'], true) => 'car',
            in_array($typeLower, ['hauler', 'road tractor', 'trailor', 'trailer', 'crane truck'], true) => 'truck_dumper',
            default => 'equipment',
        };
        $commonDetails = [
            'counter_at_purchase' => $this->text($row['R'] ?? null),
            'purchase_price' => $this->text($row['S'] ?? null),
            'purchase_price_currency' => $this->currency($row['S'] ?? null, $row['N'] ?? null),
            'shipping_cost' => $this->text($row['T'] ?? null),
            'shipping_cost_currency' => $this->currency($row['T'] ?? null, $row['N'] ?? null),
            'official_document_type' => $this->text($row['L'] ?? null),
            'official_document_location' => $this->text($row['M'] ?? null),
        ];
        $assetDetails = match ($categoryCode) {
            'car' => [...$commonDetails, 'fuel_type' => null, 'odometer_km' => null],
            'truck_dumper' => [...$commonDetails, 'vehicle_type' => $type, 'payload_tonnes' => null, 'fuel_type' => null, 'odometer_km' => null],
            'tower_crane' => [...$commonDetails, 'crane_type' => $type, 'sub_category' => $this->text($row['C'] ?? null)],
            'formwork_scaffolding' => [...$commonDetails, 'system_type' => $type, 'quantity' => $this->numberFromText($row['J'] ?? null), 'unit' => $this->unit($row['J'] ?? null), 'sub_category' => $this->text($row['C'] ?? null)],
            'generator' => null,
            default => [...$commonDetails, 'equipment_type' => $type, 'sub_category' => $this->text($row['C'] ?? null)],
        };

        return [
            'category_code' => $categoryCode,
            'brand' => $this->text($row['F'] ?? null),
            'model' => $this->text($row['H'] ?? null),
            // Formwork rows use column J for a quantity (for example, "671 m2"), not a serial number.
            'serial_number' => $categoryCode === 'formwork_scaffolding' ? null : $this->text($row['J'] ?? null),
            'manufacture_year' => $this->year($row['I'] ?? null),
            'purchase_date' => $this->date($row['Q'] ?? null),
            'condition' => $this->condition($row['O'] ?? null),
            'asset_details' => $assetDetails,
            'observations' => $this->text($row['N'] ?? null) === null ? null : 'Localisation source : '.$this->text($row['N'] ?? null),
        ];
    }

    private function text(?string $value): ?string
    {
        $value = trim((string) $value);

        return $value === '' || $value === '…..' ? null : $value;
    }

    private function year(?string $value): ?int
    {
        $value = $this->text($value);

        return $value !== null && ctype_digit($value) && (int) $value >= 1900 && (int) $value <= (int) date('Y') + 1 ? (int) $value : null;
    }

    private function date(?string $value): ?string
    {
        $value = $this->text($value);
        if ($value === null) {
            return null;
        }
        if (preg_match('/^\d{1,2}[\/-]\d{1,2}[\/-]\d{4}$/', $value) === 1) {
            $date = str_replace('/', '-', $value);

            return \DateTimeImmutable::createFromFormat('!j-n-Y', $date)?->format('Y-m-d');
        }

        return ctype_digit($value) && (int) $value > 20000 && (int) $value < 60000 ? (new \DateTimeImmutable('1899-12-30'))->modify("+{$value} days")->format('Y-m-d') : null;
    }

    private function number(?string $value): ?float
    {
        $value = str_replace([',', ' '], ['.', ''], (string) $value);

        return is_numeric($value) ? (float) $value : null;
    }

    private function kva(?string $value): ?float
    {
        return preg_match('/(\d+(?:[,.]\d+)?)\s*KVA/i', (string) $value, $matches) === 1 ? $this->number($matches[1]) : null;
    }

    private function numberFromText(?string $value): ?float
    {
        return preg_match('/(\d+(?:[,.]\d+)?)/', (string) $value, $matches) === 1 ? $this->number($matches[1]) : null;
    }

    private function unit(?string $value): ?string
    {
        return preg_match('/\d+(?:[,.]\d+)?\s*(.+)$/', (string) $value, $matches) === 1 ? trim($matches[1]) : null;
    }

    private function condition(?string $value): ?string
    {
        return mb_strtolower((string) $this->text($value)) === 'very good' ? 'very_good' : null;
    }

    private function currency(?string $value, ?string $source = null): string
    {
        $value = mb_strtoupper((string) $value);

        return str_contains($value, 'EUR') || str_contains($value, 'EURO') || str_contains(mb_strtoupper((string) $source), 'AUSTRIA') || str_contains(mb_strtoupper((string) $source), 'ANTWERP') ? 'EUR'
            : (str_contains($value, 'USD') || str_contains($value, 'DOLLAR') ? 'USD' : 'XOF');
    }
}

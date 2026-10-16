<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('equipment', function (Blueprint $table): void {
            $table->string('registration_number')->nullable()->after('serial_number');
        });

        $carCategoryId = DB::table('equipment_categories')->where('code', 'car')->value('id');

        if ($carCategoryId === null) {
            return;
        }

        $normalize = static fn (?string $value): string => mb_strtoupper((string) preg_replace('/[^A-Z0-9]/i', '', trim((string) $value)));
        $isVin = static fn (?string $value): bool => strlen($normalize($value)) === 17;

        DB::table('equipment')->where('equipment_category_id', $carCategoryId)->orderBy('id')->each(function (object $equipment) use ($isVin, $normalize): void {
            $historicSerials = [];
            $historicVins = [];

            DB::table('equipment_changes')
                ->where('equipment_id', $equipment->id)
                ->orderByDesc('occurred_at')
                ->orderByDesc('id')
                ->pluck('new_values')
                ->each(function (mixed $values) use (&$historicSerials, &$historicVins): void {
                    $values = is_string($values) ? json_decode($values, true) : (array) $values;
                    $snapshot = is_array($values['equipment'] ?? null) ? $values['equipment'] : [];
                    $serial = trim((string) ($snapshot['serial_number'] ?? ''));
                    $legacyChassis = trim((string) ($snapshot['asset_details']['chassis_number'] ?? ''));

                    if ($serial !== '') {
                        $historicSerials[] = $serial;
                    }
                    if ($legacyChassis !== '') {
                        $historicVins[] = $legacyChassis;
                    }
                });

            $current = trim((string) $equipment->serial_number);
            $historicVin = collect([...$historicVins, ...$historicSerials])->first(fn (string $value): bool => $isVin($value));
            $historicPlate = collect($historicSerials)->first(fn (string $value): bool => ! $isVin($value) && $normalize($value) !== $normalize($current));

            DB::table('equipment')->where('id', $equipment->id)->update([
                'serial_number' => $isVin($current) ? $current : $historicVin,
                'registration_number' => $isVin($current) ? $historicPlate : ($current !== '' ? $current : $historicPlate),
            ]);
        });
    }

    public function down(): void
    {
        DB::table('equipment')
            ->whereNull('serial_number')
            ->whereNotNull('registration_number')
            ->update(['serial_number' => DB::raw('registration_number')]);

        Schema::table('equipment', function (Blueprint $table): void {
            $table->dropColumn('registration_number');
        });
    }
};

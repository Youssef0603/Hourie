<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Make serial_number the only equipment identifier. A legacy chassis value
     * takes precedence because it was the vehicle identifier shown to users.
     */
    public function up(): void
    {
        DB::table('equipment')
            ->orderBy('id')
            ->each(function (object $equipment): void {
                $details = json_decode((string) $equipment->asset_details, true) ?: [];

                if (! array_key_exists('chassis_number', $details)) {
                    return;
                }

                $chassisNumber = trim((string) ($details['chassis_number'] ?? ''));
                unset($details['chassis_number']);

                DB::table('equipment')->where('id', $equipment->id)->update([
                    'serial_number' => $chassisNumber !== '' ? $chassisNumber : $equipment->serial_number,
                    'asset_details' => $details === [] ? null : json_encode($details),
                    'updated_at' => now(),
                ]);
            });
    }

    /**
     * Restore the legacy key from the canonical serial number if rolled back.
     */
    public function down(): void
    {
        $categoryIds = DB::table('equipment_categories')
            ->whereIn('code', ['equipment', 'car', 'truck_dumper'])
            ->pluck('id');

        DB::table('equipment')
            ->whereIn('equipment_category_id', $categoryIds)
            ->orderBy('id')
            ->each(function (object $equipment): void {
                $details = json_decode((string) $equipment->asset_details, true) ?: [];
                $details['chassis_number'] = $equipment->serial_number;

                DB::table('equipment')->where('id', $equipment->id)->update([
                    'asset_details' => json_encode($details),
                    'updated_at' => now(),
                ]);
            });
    }
};

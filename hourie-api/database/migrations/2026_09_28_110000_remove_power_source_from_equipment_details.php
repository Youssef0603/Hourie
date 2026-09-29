<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Remove the unused app-only field from existing Matériel records.
     */
    public function up(): void
    {
        $categoryId = DB::table('equipment_categories')->where('code', 'equipment')->value('id');

        if ($categoryId === null) {
            return;
        }

        DB::table('equipment')
            ->where('equipment_category_id', $categoryId)
            ->orderBy('id')
            ->each(function (object $equipment): void {
                $details = json_decode((string) $equipment->asset_details, true) ?: [];
                unset($details['power_source']);

                DB::table('equipment')->where('id', $equipment->id)->update([
                    'asset_details' => json_encode($details),
                    'updated_at' => now(),
                ]);
            });
    }

    /**
     * The removed values were empty placeholders and cannot be restored.
     */
    public function down(): void
    {
    }
};

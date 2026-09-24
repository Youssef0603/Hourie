<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $prefixes = [
            'generator' => 'GEN',
            'tower_crane' => 'GRT',
            'hoist' => 'MCH',
            'equipment' => 'MAT',
            'formwork_scaffolding' => 'COF',
            'portacabin' => 'BUN',
            'car' => 'VOI',
            'truck_dumper' => 'CAM',
        ];

        DB::table('equipment')
            ->join('equipment_categories', 'equipment_categories.id', '=', 'equipment.equipment_category_id')
            ->select(['equipment.id', 'equipment_categories.code'])
            ->orderBy('equipment.id')
            ->each(function (object $equipment) use ($prefixes): void {
                DB::table('equipment')
                    ->where('id', $equipment->id)
                    ->update(['asset_code' => 'A.H-'.($prefixes[$equipment->code] ?? 'AST').'-'.str_pad((string) $equipment->id, 3, '0', STR_PAD_LEFT)]);
            });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Asset identifiers are permanent references and must not be reverted automatically.
    }
};

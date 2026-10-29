<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /** @var array<string, array{name: string, prefix: string}> */
    private const CATEGORIES = [
        'earthmoving' => ['name' => 'Engins de terrassement', 'prefix' => 'TER'],
        'compaction' => ['name' => 'Matériel de compactage', 'prefix' => 'COM'],
        'road_equipment' => ['name' => 'Matériel routier', 'prefix' => 'ROU'],
        'concrete_equipment' => ['name' => 'Matériel de béton', 'prefix' => 'BET'],
        'pumps_dewatering' => ['name' => 'Pompes et assèchement', 'prefix' => 'POM'],
        'workshop_rebar' => ['name' => 'Atelier et ferraillage', 'prefix' => 'ATE'],
        'site_equipment' => ['name' => 'Équipements de chantier', 'prefix' => 'ECH'],
    ];

    public function up(): void
    {
        DB::transaction(function (): void {
            $now = now();
            $generalCategoryId = DB::table('equipment_categories')->where('code', 'equipment')->value('id');

            if ($generalCategoryId === null) {
                return;
            }

            DB::table('equipment_categories')->where('id', $generalCategoryId)->update([
                'name' => 'Autres matériels',
                'updated_at' => $now,
            ]);

            foreach (self::CATEGORIES as $code => $definition) {
                DB::table('equipment_categories')->updateOrInsert(
                    ['code' => $code],
                    [
                        'name' => $definition['name'],
                        'is_active' => true,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ],
                );
            }

            $categoryIds = DB::table('equipment_categories')
                ->whereIn('code', array_keys(self::CATEGORIES))
                ->pluck('id', 'code');

            DB::table('equipment')
                ->where('equipment_category_id', $generalCategoryId)
                ->orderBy('id')
                ->chunkById(100, function ($equipment) use ($categoryIds, $now): void {
                    foreach ($equipment as $item) {
                        $details = json_decode((string) ($item->asset_details ?? ''), true);
                        $details = is_array($details) ? $details : [];
                        $categoryCode = $this->categoryCode(
                            (string) ($details['equipment_type'] ?? ''),
                            (string) ($details['sub_category'] ?? ''),
                        );

                        if ($categoryCode === null) {
                            continue;
                        }

                        DB::table('equipment')->where('id', $item->id)->update([
                            'equipment_category_id' => $categoryIds[$categoryCode],
                            'asset_code' => $this->assetCode(self::CATEGORIES[$categoryCode]['prefix'], (int) $item->id),
                            'updated_at' => $now,
                        ]);
                    }
                });
        });
    }

    public function down(): void
    {
        DB::transaction(function (): void {
            $now = now();
            $generalCategoryId = DB::table('equipment_categories')->where('code', 'equipment')->value('id');
            $specializedCategoryIds = DB::table('equipment_categories')
                ->whereIn('code', array_keys(self::CATEGORIES))
                ->pluck('id');

            if ($generalCategoryId === null) {
                return;
            }

            DB::table('equipment')
                ->whereIn('equipment_category_id', $specializedCategoryIds)
                ->orderBy('id')
                ->chunkById(100, function ($equipment) use ($generalCategoryId, $now): void {
                    foreach ($equipment as $item) {
                        DB::table('equipment')->where('id', $item->id)->update([
                            'equipment_category_id' => $generalCategoryId,
                            'asset_code' => $this->assetCode('MAT', (int) $item->id),
                            'updated_at' => $now,
                        ]);
                    }
                });

            DB::table('equipment_categories')->whereIn('id', $specializedCategoryIds)->delete();
            DB::table('equipment_categories')->where('id', $generalCategoryId)->update([
                'name' => 'Matériel',
                'updated_at' => $now,
            ]);
        });
    }

    private function categoryCode(string $type, string $subCategory): ?string
    {
        $type = mb_strtolower(trim($type));
        $subCategory = mb_strtolower(trim($subCategory));

        return match (true) {
            in_array($type, ['excavator', 'wheel loader', 'skid loader', 'grader', 'wheel excavator', 'dozer', 'backhoe'], true) => 'earthmoving',
            in_array($type, ['asphalt roller', 'rouleau duplex', 'roller', 'vibrating roller'], true) => 'compaction',
            in_array($type, ['sweeper', 'asphalt paver', 'bitumen sprayer', 'floor saw', 'milling machine', 'soil stabilizer'], true) => 'road_equipment',
            in_array($type, ['concrete mixer', 'transit mixer', 'concrete bucket', 'concrete pump'], true) => 'concrete_equipment',
            $type === 'batching plant' && $subCategory === 'concrete' => 'concrete_equipment',
            $type === 'batching plant' && $subCategory === 'asphalt & paving' => 'road_equipment',
            $type === 'motor pump' => 'pumps_dewatering',
            in_array($type, ['bending machine', 'cutting machine', 'diesel welding machine', 'bar cutting machine', 'bar bending machine'], true) => 'workshop_rebar',
            in_array($type, ['portable light tower', 'tower light', 'fuel tank', 'air compressor', 'forklift', 'water tank'], true) => 'site_equipment',
            default => null,
        };
    }

    private function assetCode(string $prefix, int $equipmentId): string
    {
        return 'A.H-'.$prefix.'-'.str_pad((string) $equipmentId, 3, '0', STR_PAD_LEFT);
    }
};

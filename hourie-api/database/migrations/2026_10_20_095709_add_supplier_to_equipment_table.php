<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('equipment', function (Blueprint $table) {
            $table->string('supplier')->nullable()->after('purchase_date');
        });

        DB::table('equipment')
            ->whereNotNull('asset_details')
            ->orderBy('id')
            ->chunkById(100, function ($equipment): void {
                foreach ($equipment as $item) {
                    $details = json_decode((string) $item->asset_details, true);
                    if (! is_array($details) || ! array_key_exists('supplier', $details)) {
                        continue;
                    }

                    $supplier = trim((string) $details['supplier']);
                    unset($details['supplier']);

                    DB::table('equipment')->where('id', $item->id)->update([
                        'supplier' => $supplier === '' ? null : $supplier,
                        'asset_details' => json_encode($details, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                    ]);
                }
            });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('equipment')
            ->whereNotNull('supplier')
            ->orderBy('id')
            ->chunkById(100, function ($equipment): void {
                foreach ($equipment as $item) {
                    $details = json_decode((string) ($item->asset_details ?? '[]'), true);
                    $details = is_array($details) ? $details : [];
                    $details['supplier'] = $item->supplier;

                    DB::table('equipment')->where('id', $item->id)->update([
                        'asset_details' => json_encode($details, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                    ]);
                }
            });

        Schema::table('equipment', function (Blueprint $table) {
            $table->dropColumn('supplier');
        });
    }
};

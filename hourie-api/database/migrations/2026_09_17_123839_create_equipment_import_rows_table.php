<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('equipment_import_rows', function (Blueprint $table) {
            $table->id();
            $table->foreignId('equipment_import_id')->constrained()->restrictOnDelete();
            $table->foreignId('equipment_id')->nullable()->constrained('equipment')->restrictOnDelete();
            $table->string('sheet_name');
            $table->unsignedInteger('row_number');
            $table->string('source_asset_code', 100)->nullable();
            $table->string('status', 30);
            $table->json('raw_data');
            $table->json('messages')->nullable();
            $table->timestamps();

            $table->unique(['equipment_import_id', 'sheet_name', 'row_number'], 'equipment_import_row_unique');
            $table->index('source_asset_code');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('equipment_import_rows');
    }
};

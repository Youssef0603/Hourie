<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bonds', function (Blueprint $table): void {
            $table->foreignId('location_id')->nullable()->after('project_id')->constrained('locations')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('bonds', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('location_id');
        });
    }
};

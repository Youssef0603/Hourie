<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('equipment', function (Blueprint $table): void {
            $table->string('usage_status', 20)->nullable()->after('condition')->index();
        });
    }

    public function down(): void
    {
        Schema::table('equipment', function (Blueprint $table): void {
            $table->dropIndex(['usage_status']);
            $table->dropColumn('usage_status');
        });
    }
};

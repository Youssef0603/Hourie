<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('purchase_orders', function (Blueprint $table): void {
            $table->string('pdf_disk', 30)->nullable()->after('notes');
            $table->string('pdf_path')->nullable()->after('pdf_disk');
            $table->timestamp('pdf_generated_at')->nullable()->after('pdf_path');
        });
    }

    public function down(): void
    {
        Schema::table('purchase_orders', function (Blueprint $table): void {
            $table->dropColumn(['pdf_disk', 'pdf_path', 'pdf_generated_at']);
        });
    }
};

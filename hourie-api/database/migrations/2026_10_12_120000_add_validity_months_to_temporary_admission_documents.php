<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('temporary_admission_documents', function (Blueprint $table) {
            $table->unsignedSmallInteger('validity_months')->nullable()->after('document_date');
        });

        DB::table('temporary_admission_documents')
            ->where('document_type', 'admission')
            ->orderBy('id')
            ->each(function (object $document): void {
                $validityMonths = DB::table('temporary_admissions')
                    ->where('id', $document->temporary_admission_id)
                    ->value('validity_months');

                DB::table('temporary_admission_documents')
                    ->where('id', $document->id)
                    ->update(['validity_months' => $validityMonths ?? 12]);
            });
    }

    public function down(): void
    {
        Schema::table('temporary_admission_documents', function (Blueprint $table) {
            $table->dropColumn('validity_months');
        });
    }
};

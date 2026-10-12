<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('temporary_admissions')
            ->select('id', 'entered_on')
            ->orderBy('id')
            ->each(function (object $admission): void {
                DB::table('temporary_admission_documents')
                    ->where('temporary_admission_id', $admission->id)
                    ->where('document_type', 'admission')
                    ->whereDate('document_date', $admission->entered_on)
                    ->update(['document_type' => 'initial']);
            });
    }

    public function down(): void
    {
        DB::table('temporary_admission_documents')
            ->where('document_type', 'initial')
            ->update(['document_type' => 'admission']);
    }
};

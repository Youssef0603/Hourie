<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('temporary_admission_documents')
            ->whereIn('document_type', ['initial', 'renewal'])
            ->update(['document_type' => 'admission']);

        DB::table('temporary_admission_documents')
            ->where('document_type', 'admission')
            ->whereNull('document_date')
            ->orderBy('id')
            ->each(function (object $document): void {
                $enteredOn = DB::table('temporary_admissions')
                    ->where('id', $document->temporary_admission_id)
                    ->value('entered_on');

                DB::table('temporary_admission_documents')
                    ->where('id', $document->id)
                    ->update(['document_date' => $enteredOn]);
            });

        DB::table('temporary_admissions')
            ->where('status', 'renewed')
            ->update(['status' => 'active']);
    }

    public function down(): void
    {
        DB::table('temporary_admission_documents')
            ->where('document_type', 'admission')
            ->update(['document_type' => 'initial']);
    }
};

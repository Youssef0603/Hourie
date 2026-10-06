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
        Schema::create('temporary_admissions', function (Blueprint $table) {
            $table->id();
            $table->string('customs_reference')->unique();
            $table->date('entered_on');
            $table->string('status')->default('active');
            $table->date('returned_on')->nullable();
            $table->string('closure_reason')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
        Schema::create('temporary_admission_equipment', function (Blueprint $table) {
            $table->id();
            $table->foreignId('temporary_admission_id')->constrained()->cascadeOnDelete();
            $table->foreignId('equipment_id')->constrained()->cascadeOnDelete();
            $table->unique(['temporary_admission_id', 'equipment_id'], 'temporary_admission_equipment_unique');
        });
        Schema::create('temporary_admission_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('temporary_admission_id')->constrained()->cascadeOnDelete();
            $table->foreignId('uploaded_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('document_type');
            $table->date('document_date')->nullable();
            $table->string('disk');
            $table->string('path');
            $table->string('original_name');
            $table->string('mime_type');
            $table->unsignedBigInteger('size_bytes');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('temporary_admission_documents');
        Schema::dropIfExists('temporary_admission_equipment');
        Schema::dropIfExists('temporary_admissions');
    }
};

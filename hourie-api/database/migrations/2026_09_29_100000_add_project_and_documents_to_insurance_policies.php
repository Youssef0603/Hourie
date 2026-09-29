<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('insurance_policies', function (Blueprint $table): void {
            $table->foreignId('project_id')->nullable()->after('insured_situation')->constrained()->nullOnDelete();
        });

        Schema::create('insurance_policy_documents', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('insurance_policy_id')->constrained()->cascadeOnDelete();
            $table->foreignId('uploaded_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('disk');
            $table->string('path');
            $table->string('original_name');
            $table->string('mime_type', 100);
            $table->unsignedBigInteger('size_bytes');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('insurance_policy_documents');
        Schema::table('insurance_policies', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('project_id');
        });
    }
};

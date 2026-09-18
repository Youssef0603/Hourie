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
        Schema::create('equipment_imports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('imported_by_user_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->string('original_filename');
            $table->char('file_sha256', 64)->unique();
            $table->string('status', 30);
            $table->timestamp('imported_at')->nullable();
            $table->json('summary')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('equipment_imports');
    }
};

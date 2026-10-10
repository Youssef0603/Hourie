<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employee_project_assignments', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->foreignId('project_id')->constrained()->restrictOnDelete();
            $table->string('project_role');
            $table->date('started_on')->nullable();
            $table->date('ended_on')->nullable();
            $table->timestamps();
            $table->index(['employee_id', 'ended_on']);
            $table->index(['project_id', 'ended_on']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employee_project_assignments');
    }
};

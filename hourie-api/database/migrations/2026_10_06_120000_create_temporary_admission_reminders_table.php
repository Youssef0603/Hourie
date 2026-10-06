<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('temporary_admission_reminders', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('temporary_admission_id')->constrained()->cascadeOnDelete();
            $table->date('expiry_date');
            $table->date('reminder_date');
            $table->string('reminder_type', 20);
            $table->timestamp('sent_at');
            $table->timestamps();
            $table->unique(
                ['temporary_admission_id', 'expiry_date', 'reminder_date'],
                'temporary_admission_reminder_once',
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('temporary_admission_reminders');
    }
};

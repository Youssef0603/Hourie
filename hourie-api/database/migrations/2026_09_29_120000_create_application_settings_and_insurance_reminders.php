<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('application_settings', function (Blueprint $table): void {
            $table->id();
            $table->string('key')->unique();
            $table->json('value');
            $table->timestamps();
        });
        Schema::create('insurance_policy_reminders', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('insurance_policy_id')->constrained()->restrictOnDelete();
            $table->date('expiry_date');
            $table->date('reminder_date');
            $table->string('reminder_type', 20);
            $table->timestamp('sent_at');
            $table->unique(['insurance_policy_id', 'expiry_date', 'reminder_date'], 'insurance_reminder_once');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('insurance_policy_reminders');
        Schema::dropIfExists('application_settings');
    }
};

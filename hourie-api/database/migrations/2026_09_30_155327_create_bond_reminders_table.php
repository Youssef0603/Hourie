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
        Schema::create('bond_reminders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bond_id')->constrained()->cascadeOnDelete();
            $table->date('expiry_date');
            $table->date('reminder_date');
            $table->string('reminder_type', 20);
            $table->timestamp('sent_at');
            $table->unique(['bond_id', 'expiry_date', 'reminder_date'], 'bond_reminder_once');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bond_reminders');
    }
};

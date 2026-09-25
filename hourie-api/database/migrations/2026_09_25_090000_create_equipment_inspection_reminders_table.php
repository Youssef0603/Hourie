<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('equipment_inspection_reminders')) {
            Schema::table('equipment_inspection_reminders', function (Blueprint $table) {
                $table->index(['inspection_date', 'reminder_date'], 'inspection_reminder_dates_idx');
            });

            return;
        }

        Schema::create('equipment_inspection_reminders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('equipment_id')->constrained()->restrictOnDelete();
            $table->date('inspection_date');
            $table->date('reminder_date');
            $table->string('reminder_type', 20);
            $table->timestamp('sent_at');

            $table->unique(['equipment_id', 'inspection_date', 'reminder_date'], 'equipment_inspection_reminder_once');
            $table->index(['inspection_date', 'reminder_date'], 'inspection_reminder_dates_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('equipment_inspection_reminders');
    }
};

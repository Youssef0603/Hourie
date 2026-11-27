<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Toll badges are no longer tracked in Hourie (the HKB badges are kept in the
 * Badges_Pont_HKB.xlsx sheet instead).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('toll_badges');
    }

    public function down(): void
    {
        Schema::create('toll_badges', function (Blueprint $table): void {
            $table->id();
            $table->string('operator', 20);
            $table->string('badge_number', 40);
            $table->string('serial_number', 60)->nullable();
            $table->string('subscription_number', 40)->nullable();
            $table->string('registered_phone', 40)->nullable();
            $table->foreignId('equipment_id')->constrained('equipment')->cascadeOnDelete();
            $table->string('status', 20)->default('active');
            $table->decimal('balance', 15, 2)->nullable();
            $table->date('balance_checked_on')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['operator', 'badge_number']);
        });
    }
};

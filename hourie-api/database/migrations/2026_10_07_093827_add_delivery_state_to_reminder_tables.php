<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach ([
            'insurance_policy_reminders',
            'bond_reminders',
            'temporary_admission_reminders',
            'equipment_inspection_reminders',
        ] as $tableName) {
            Schema::table($tableName, function (Blueprint $table): void {
                $table->timestamp('queued_at')->nullable()->after('sent_at');
                $table->timestamp('failed_at')->nullable()->after('queued_at');
                $table->unsignedSmallInteger('attempts')->default(0)->after('failed_at');
                $table->text('last_error')->nullable()->after('attempts');
                $table->timestamp('sent_at')->nullable()->change();
            });
        }
    }

    public function down(): void
    {
        foreach ([
            'insurance_policy_reminders',
            'bond_reminders',
            'temporary_admission_reminders',
            'equipment_inspection_reminders',
        ] as $tableName) {
            Schema::table($tableName, function (Blueprint $table): void {
                $table->dropColumn(['queued_at', 'failed_at', 'attempts', 'last_error']);
                $table->timestamp('sent_at')->nullable(false)->change();
            });
        }
    }
};

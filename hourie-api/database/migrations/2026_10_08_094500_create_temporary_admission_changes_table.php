<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('temporary_admission_changes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('temporary_admission_id')->constrained()->cascadeOnDelete();
            $table->foreignId('actor_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action', 40);
            $table->json('previous_values')->nullable();
            $table->json('new_values');
            $table->timestamp('occurred_at');
            $table->timestamp('created_at')->useCurrent();
            $table->index(['temporary_admission_id', 'occurred_at'], 'temporary_admission_changes_recorded_index');
        });

        DB::table('temporary_admissions')->orderBy('id')->chunkById(500, function ($admissions): void {
            DB::table('temporary_admission_changes')->insert($admissions->map(fn ($admission) => [
                'temporary_admission_id' => $admission->id,
                'actor_user_id' => $admission->created_by_user_id,
                'action' => 'created',
                'previous_values' => null,
                'new_values' => json_encode(['customs_reference' => $admission->customs_reference], JSON_THROW_ON_ERROR),
                'occurred_at' => $admission->created_at,
                'created_at' => $admission->created_at,
            ])->all());
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('temporary_admission_changes');
    }
};

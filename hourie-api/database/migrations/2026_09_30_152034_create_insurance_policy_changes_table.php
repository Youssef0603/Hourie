<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('insurance_policy_changes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('insurance_policy_id')->constrained()->cascadeOnDelete();
            $table->foreignId('actor_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action', 40);
            $table->json('previous_values')->nullable();
            $table->json('new_values');
            $table->timestamp('occurred_at');
            $table->timestamp('created_at')->useCurrent();
            $table->index(['insurance_policy_id', 'occurred_at']);
        });

        DB::table('insurance_policies')->orderBy('id')->chunkById(500, function ($policies): void {
            DB::table('insurance_policy_changes')->insert($policies->map(fn ($policy) => [
                'insurance_policy_id' => $policy->id,
                'actor_user_id' => $policy->created_by_user_id,
                'action' => 'created',
                'previous_values' => null,
                'new_values' => json_encode(['policy_number' => $policy->policy_number], JSON_THROW_ON_ERROR),
                'occurred_at' => $policy->created_at,
                'created_at' => $policy->created_at,
            ])->all());
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('insurance_policy_changes');
    }
};

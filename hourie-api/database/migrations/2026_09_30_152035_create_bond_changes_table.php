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
        Schema::create('bond_changes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bond_id')->constrained()->cascadeOnDelete();
            $table->foreignId('actor_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action', 40);
            $table->json('previous_values')->nullable();
            $table->json('new_values');
            $table->timestamp('occurred_at');
            $table->timestamp('created_at')->useCurrent();
            $table->index(['bond_id', 'occurred_at']);
        });

        DB::table('bonds')->orderBy('id')->chunkById(500, function ($bonds): void {
            DB::table('bond_changes')->insert($bonds->map(fn ($bond) => [
                'bond_id' => $bond->id,
                'actor_user_id' => $bond->created_by_user_id,
                'action' => 'created',
                'previous_values' => null,
                'new_values' => json_encode(['project_id' => $bond->project_id], JSON_THROW_ON_ERROR),
                'occurred_at' => $bond->created_at,
                'created_at' => $bond->created_at,
            ])->all());
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bond_changes');
    }
};

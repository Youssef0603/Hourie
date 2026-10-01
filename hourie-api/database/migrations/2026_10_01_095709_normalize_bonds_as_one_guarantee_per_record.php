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
        Schema::table('bonds', function (Blueprint $table): void {
            $table->string('bond_type', 40)->default('performance')->after('location_id');
            $table->index(['bond_type', 'expires_on']);
        });

        Schema::create('bond_document_links', function (Blueprint $table): void {
            $table->foreignId('bond_id')->constrained()->cascadeOnDelete();
            $table->foreignId('bond_document_id')->constrained()->cascadeOnDelete();
            $table->primary(['bond_id', 'bond_document_id']);
        });

        DB::table('bond_documents')->orderBy('id')->get()->each(function (object $document): void {
            DB::table('bond_document_links')->insert([
                'bond_id' => $document->bond_id,
                'bond_document_id' => $document->id,
            ]);
        });

        Schema::table('bond_documents', function (Blueprint $table): void {
            $table->dropForeign(['bond_id']);
            $table->unsignedBigInteger('bond_id')->nullable()->change();
            $table->foreign('bond_id')->references('id')->on('bonds')->nullOnDelete();
        });

        DB::table('bonds')->orderBy('id')->get()->each(function (object $bond): void {
            $types = collect([
                'advance_payment' => $bond->advance_payment_amount,
                'performance' => $bond->performance_amount,
                'retention' => $bond->retention_amount,
            ])->filter(fn (mixed $amount): bool => (float) $amount > 0);

            if ($types->isEmpty()) {
                $types = collect(['performance' => $bond->amount]);
            }

            $documentIds = DB::table('bond_document_links')
                ->where('bond_id', $bond->id)
                ->pluck('bond_document_id');

            $first = true;
            foreach ($types as $type => $amount) {
                if ($first) {
                    DB::table('bonds')->where('id', $bond->id)->update([
                        'bond_type' => $type,
                        'amount' => $amount,
                        'updated_at' => now(),
                    ]);
                    $first = false;

                    continue;
                }

                $newBondId = DB::table('bonds')->insertGetId([
                    'project_id' => $bond->project_id,
                    'location_id' => $bond->location_id,
                    'bond_type' => $type,
                    'issuer' => $bond->issuer,
                    'advance_payment_amount' => 0,
                    'performance_amount' => 0,
                    'retention_amount' => 0,
                    'amount' => $amount,
                    'currency' => $bond->currency,
                    'issued_on' => $bond->issued_on,
                    'expires_on' => $bond->expires_on,
                    'notes' => $bond->notes,
                    'created_by_user_id' => $bond->created_by_user_id,
                    'created_at' => $bond->created_at,
                    'updated_at' => now(),
                ]);

                foreach ($documentIds as $documentId) {
                    DB::table('bond_document_links')->insert([
                        'bond_id' => $newBondId,
                        'bond_document_id' => $documentId,
                    ]);
                }

                if (Schema::hasTable('bond_changes')) {
                    DB::table('bond_changes')->insert([
                        'bond_id' => $newBondId,
                        'actor_user_id' => $bond->created_by_user_id,
                        'action' => 'created',
                        'previous_values' => null,
                        'new_values' => json_encode([
                            'project_id' => $bond->project_id,
                            'bond_type' => $type,
                            'amount' => $amount,
                        ], JSON_THROW_ON_ERROR),
                        'occurred_at' => $bond->created_at,
                        'created_at' => $bond->created_at,
                    ]);
                }
            }
        });

        Schema::table('bonds', function (Blueprint $table): void {
            $table->dropColumn(['advance_payment_amount', 'performance_amount', 'retention_amount']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('bonds', function (Blueprint $table): void {
            $table->decimal('advance_payment_amount', 15, 2)->default(0);
            $table->decimal('performance_amount', 15, 2)->default(0);
            $table->decimal('retention_amount', 15, 2)->default(0);
        });

        DB::table('bonds')->where('bond_type', 'advance_payment')->update(['advance_payment_amount' => DB::raw('amount')]);
        DB::table('bonds')->where('bond_type', 'performance')->update(['performance_amount' => DB::raw('amount')]);
        DB::table('bonds')->where('bond_type', 'retention')->update(['retention_amount' => DB::raw('amount')]);

        Schema::dropIfExists('bond_document_links');

        Schema::table('bond_documents', function (Blueprint $table): void {
            $table->dropForeign(['bond_id']);
            $table->foreign('bond_id')->references('id')->on('bonds')->cascadeOnDelete();
        });

        Schema::table('bonds', function (Blueprint $table): void {
            $table->dropIndex(['bond_type', 'expires_on']);
            $table->dropColumn('bond_type');
        });
    }
};

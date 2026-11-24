<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Subcontractors are paid partly in cash and partly by cheque or transfer,
     * with VAT only on the cheque part, and each part is followed separately.
     *
     * - subcontracts.cash_percent: share of each amount paid in cash.
     * - subcontracts.historical_works_amount: works certified before Hourie that
     *   are not broken down by work item, carried into every later valuation.
     * - subcontract_valuations.kind: "regular" situation, the start "advance",
     *   or the "opening" balance of a contract that started before Hourie.
     * - subcontract_valuations.cash_amount / cheque_amount: the split of the
     *   amount before VAT; VAT is charged on the cheque part only.
     * - subcontract_valuation_payments.vat_amount: the part of a cheque or
     *   transfer that pays VAT.
     */
    public function up(): void
    {
        Schema::table('subcontracts', function (Blueprint $table): void {
            $table->decimal('cash_percent', 5, 2)->default(0)->after('advance_recovery_rate');
            $table->decimal('historical_works_amount', 15, 2)->default(0)->after('cash_percent');
        });

        Schema::table('subcontract_valuations', function (Blueprint $table): void {
            $table->string('kind', 20)->default('regular')->after('sequence');
            $table->decimal('cash_percent', 5, 2)->default(0)->after('backcharges');
            $table->decimal('cash_amount', 15, 2)->default(0)->after('previously_certified');
            $table->decimal('cheque_amount', 15, 2)->default(0)->after('cash_amount');
        });

        Schema::table('subcontract_valuation_payments', function (Blueprint $table): void {
            $table->decimal('vat_amount', 15, 2)->default(0)->after('amount');
        });

        // Existing valuations were paid entirely by cheque or transfer.
        DB::table('subcontract_valuations')->update(['cheque_amount' => DB::raw('net_due - vat_amount')]);

        DB::table('subcontract_valuation_payments')->whereNull('method')->update(['method' => 'transfer']);
        // Existing payments covered VAT in proportion to the valuation they paid.
        DB::table('subcontract_valuation_payments')
            ->join('subcontract_valuations', 'subcontract_valuations.id', '=', 'subcontract_valuation_payments.valuation_id')
            ->where('subcontract_valuations.net_due', '>', 0)
            ->where('subcontract_valuations.vat_amount', '>', 0)
            ->select('subcontract_valuation_payments.id', 'subcontract_valuation_payments.amount', 'subcontract_valuations.vat_amount', 'subcontract_valuations.net_due')
            ->orderBy('subcontract_valuation_payments.id')
            ->get()
            ->each(fn (object $payment) => DB::table('subcontract_valuation_payments')->where('id', $payment->id)->update([
                'vat_amount' => round((float) $payment->amount * (float) $payment->vat_amount / (float) $payment->net_due, 2),
            ]));

        // The advance becomes a payable entry, like a valuation.
        DB::table('subcontracts')->where('advance_amount', '>', 0)->orderBy('id')->each(function (object $subcontract): void {
            $vat = round((float) $subcontract->advance_amount * (float) $subcontract->vat_rate / 100, 2);
            DB::table('subcontract_valuations')->insert([
                'subcontract_id' => $subcontract->id,
                'sequence' => 0,
                'kind' => 'advance',
                'reference' => $subcontract->reference.'-AVANCE',
                'valuation_date' => $subcontract->signed_on ?? substr((string) $subcontract->created_at, 0, 10),
                'period_end' => $subcontract->signed_on ?? substr((string) $subcontract->created_at, 0, 10),
                'status' => 'approved',
                'cheque_amount' => $subcontract->advance_amount,
                'vat_amount' => $vat,
                'net_due' => round((float) $subcontract->advance_amount + $vat, 2),
                'created_by_user_id' => $subcontract->created_by_user_id,
                'approved_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        });
    }

    public function down(): void
    {
        DB::table('subcontract_valuations')->where('kind', 'advance')->delete();

        Schema::table('subcontract_valuation_payments', function (Blueprint $table): void {
            $table->dropColumn('vat_amount');
        });

        Schema::table('subcontract_valuations', function (Blueprint $table): void {
            $table->dropColumn(['kind', 'cash_percent', 'cash_amount', 'cheque_amount']);
        });

        Schema::table('subcontracts', function (Blueprint $table): void {
            $table->dropColumn(['cash_percent', 'historical_works_amount']);
        });
    }
};

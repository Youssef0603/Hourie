<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Purchase order numbers move from a global integer (0000821) to a
 * per-site reference (BC-821-26-0001). Existing numbers keep their printed
 * seven-digit form, and each order is linked to the site it was raised for.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('purchase_orders', function (Blueprint $table): void {
            $table->string('number', 40)->nullable()->change();
            $table->foreignId('project_id')->nullable()->after('created_by_user_id')->constrained('projects')->nullOnDelete();
        });

        DB::table('purchase_orders')->orderBy('id')->each(function (object $purchaseOrder): void {
            DB::table('purchase_orders')->where('id', $purchaseOrder->id)->update([
                'number' => $purchaseOrder->number === null ? null : str_pad((string) $purchaseOrder->number, 7, '0', STR_PAD_LEFT),
                'project_id' => $purchaseOrder->project_name === null
                    ? null
                    : DB::table('projects')->where('name', $purchaseOrder->project_name)->value('id'),
            ]);
        });
    }

    public function down(): void
    {
        DB::table('purchase_orders')->where('number', 'like', 'BC-%')->update(['number' => null]);

        Schema::table('purchase_orders', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('project_id');
            $table->unsignedBigInteger('number')->nullable()->change();
        });
    }
};

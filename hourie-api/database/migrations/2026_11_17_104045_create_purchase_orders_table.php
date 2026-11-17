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
        Schema::create('purchase_orders', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('number')->nullable()->unique();
            $table->foreignId('created_by_user_id')->constrained('users');
            $table->string('supplier_name');
            $table->string('supplier_phone')->nullable();
            $table->string('supplier_fax')->nullable();
            $table->date('ordered_on');
            $table->string('follow_up_agent')->nullable();
            $table->string('contact_name')->nullable();
            $table->string('project_name')->nullable();
            $table->string('reason')->nullable();
            $table->string('prepared_by')->nullable();
            $table->string('ordered_by')->nullable();
            $table->string('approved_by')->nullable();
            $table->decimal('vat_rate', 5, 2)->default(18);
            $table->char('currency', 3)->default('XOF');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index(['ordered_on', 'id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('purchase_orders');
    }
};

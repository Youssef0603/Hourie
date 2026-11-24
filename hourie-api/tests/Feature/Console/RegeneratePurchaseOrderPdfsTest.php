<?php

use App\Models\PurchaseOrder;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Storage;

uses(LazilyRefreshDatabase::class);

beforeEach(function (): void {
    Storage::fake((string) config('filesystems.equipment_documents_disk'));
});

it('redraws the stored PDF of every purchase order', function () {
    $orders = PurchaseOrder::factory()->count(2)->create(['pdf_generated_at' => null]);

    $this->artisan('purchase-orders:regenerate-pdfs')
        ->expectsOutput($orders[0]->number)
        ->expectsOutput($orders[1]->number)
        ->expectsOutput('2 purchase order PDF(s) regenerated.')
        ->assertSuccessful();

    $orders->each(function (PurchaseOrder $order): void {
        $order->refresh();
        expect($order->pdf_generated_at)->not->toBeNull();
        Storage::disk($order->pdf_disk)->assertExists($order->pdf_path);
    });
});

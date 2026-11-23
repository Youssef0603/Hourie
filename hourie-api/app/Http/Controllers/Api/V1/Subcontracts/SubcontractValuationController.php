<?php

namespace App\Http\Controllers\Api\V1\Subcontracts;

use App\Http\Controllers\Controller;
use App\Http\Requests\Subcontracts\SaveSubcontractValuationRequest;
use App\Http\Requests\Subcontracts\StoreValuationInvoiceRequest;
use App\Http\Requests\Subcontracts\StoreValuationPaymentRequest;
use App\Http\Resources\SubcontractValuationResource;
use App\Models\Subcontract;
use App\Models\SubcontractValuation;
use App\Models\SubcontractValuationDocument;
use App\Models\SubcontractValuationPayment;
use App\Services\SubcontractValuationCalculator;
use Brick\Math\BigDecimal;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

/**
 * Valuation workflow: draft → submitted → approved → partially paid → paid.
 *
 * Controls: only one valuation is open per subcontract at a time, cumulative
 * quantities can never exceed the authorised quantity (contract + variations),
 * payments can only be recorded once the subcontractor's invoice equals the
 * net amount due, and the payments of a valuation never exceed that amount.
 */
class SubcontractValuationController extends Controller
{
    public function __construct(private SubcontractValuationCalculator $calculator) {}

    public function store(SaveSubcontractValuationRequest $request, Subcontract $subcontract): JsonResponse
    {
        if ($subcontract->valuations()->whereNotIn('status', SubcontractValuation::CERTIFIED_STATUSES)->exists()) {
            throw ValidationException::withMessages(['valuation' => [__('validation.subcontract_open_valuation_exists')]]);
        }

        $valuation = DB::transaction(function () use ($request, $subcontract): SubcontractValuation {
            $sequence = ((int) $subcontract->valuations()->max('sequence')) + 1;
            $valuation = $subcontract->valuations()->create([
                ...$request->safe()->except('lines'),
                'sequence' => $sequence,
                'reference' => $subcontract->reference.'-SIT-'.str_pad((string) $sequence, 2, '0', STR_PAD_LEFT),
                'status' => SubcontractValuation::STATUS_DRAFT,
                'created_by_user_id' => $request->user()->id,
            ]);
            $this->saveLines($valuation, $request->validated('lines'));

            return $this->calculator->calculate($valuation);
        });

        return $this->respond($valuation)->setStatusCode(201);
    }

    public function show(SubcontractValuation $valuation): JsonResponse
    {
        return $this->respond($valuation);
    }

    public function update(SaveSubcontractValuationRequest $request, SubcontractValuation $valuation): JsonResponse
    {
        $this->ensureStatus($valuation, [SubcontractValuation::STATUS_DRAFT]);

        DB::transaction(function () use ($request, $valuation): void {
            $valuation->update($request->safe()->except('lines'));
            $this->saveLines($valuation, $request->validated('lines'));
            $this->calculator->calculate($valuation);
        });

        return $this->respond($valuation->fresh());
    }

    public function destroy(Request $request, SubcontractValuation $valuation): Response
    {
        $this->authorizeManagement($request);
        $this->ensureStatus($valuation, [SubcontractValuation::STATUS_DRAFT]);
        $valuation->documents->each(fn (SubcontractValuationDocument $document) => Storage::disk($document->disk)->delete($document->path));
        $valuation->delete();

        return response()->noContent();
    }

    public function submit(Request $request, SubcontractValuation $valuation): JsonResponse
    {
        return $this->transition($request, $valuation, [SubcontractValuation::STATUS_DRAFT], [
            'status' => SubcontractValuation::STATUS_SUBMITTED,
            'submitted_at' => now(),
        ]);
    }

    public function returnToDraft(Request $request, SubcontractValuation $valuation): JsonResponse
    {
        return $this->transition($request, $valuation, [SubcontractValuation::STATUS_SUBMITTED], [
            'status' => SubcontractValuation::STATUS_DRAFT,
            'submitted_at' => null,
        ]);
    }

    public function approve(Request $request, SubcontractValuation $valuation): JsonResponse
    {
        $this->calculator->calculate($valuation);

        return $this->transition($request, $valuation, [SubcontractValuation::STATUS_SUBMITTED], [
            'status' => SubcontractValuation::STATUS_APPROVED,
            'approved_at' => now(),
            'approved_by_user_id' => $request->user()->id,
        ]);
    }

    /**
     * Records money actually paid to the subcontractor. A valuation can be
     * paid in several transfers; it becomes "paid" once the payments reach
     * its net due, and payments can never exceed it.
     */
    public function storePayment(StoreValuationPaymentRequest $request, SubcontractValuation $valuation): JsonResponse
    {
        DB::transaction(function () use ($request, $valuation): void {
            $valuation = SubcontractValuation::query()->lockForUpdate()->findOrFail($valuation->id);
            $this->ensureStatus($valuation, [SubcontractValuation::STATUS_APPROVED, SubcontractValuation::STATUS_PARTIALLY_PAID]);

            if ($valuation->invoice_amount === null || ! BigDecimal::of((string) $valuation->invoice_amount)->isEqualTo((string) $valuation->net_due)) {
                throw ValidationException::withMessages(['invoice_amount' => [__('validation.subcontract_invoice_mismatch', [
                    'invoice' => $valuation->invoice_amount ?? '—',
                    'net' => $valuation->net_due,
                ])]]);
            }

            $balance = $valuation->balanceDue();
            if (BigDecimal::of((string) $request->validated('amount'))->isGreaterThan($balance)) {
                throw ValidationException::withMessages(['amount' => [__('validation.subcontract_payment_exceeds_balance', [
                    'balance' => (string) $balance->toScale(2),
                ])]]);
            }

            $valuation->payments()->create([
                ...$request->validated(),
                'recorded_by_user_id' => $request->user()->id,
            ]);
            $this->syncPaymentStatus($valuation);
        });

        return $this->respond($valuation->fresh());
    }

    /** Removes a payment recorded by mistake and reopens the balance it covered. */
    public function destroyPayment(Request $request, SubcontractValuation $valuation, SubcontractValuationPayment $payment): JsonResponse
    {
        $this->authorizeManagement($request);
        abort_unless($payment->valuation_id === $valuation->id, 404);
        $this->ensureStatus($valuation, [SubcontractValuation::STATUS_PARTIALLY_PAID, SubcontractValuation::STATUS_PAID]);

        DB::transaction(function () use ($valuation, $payment): void {
            $payment->delete();
            $this->syncPaymentStatus($valuation);
        });

        return $this->respond($valuation->fresh());
    }

    public function invoice(StoreValuationInvoiceRequest $request, SubcontractValuation $valuation): JsonResponse
    {
        $this->ensureStatus($valuation, [SubcontractValuation::STATUS_SUBMITTED, SubcontractValuation::STATUS_APPROVED]);

        DB::transaction(function () use ($request, $valuation): void {
            $valuation->update($request->safe()->only(['invoice_number', 'invoice_date', 'invoice_amount']));

            if ($request->hasFile('invoice_file')) {
                $file = $request->file('invoice_file');
                $disk = (string) config('filesystems.equipment_documents_disk');
                $valuation->documents()->create([
                    'type' => SubcontractValuationDocument::TYPE_INVOICE,
                    'uploaded_by_user_id' => $request->user()->id,
                    'disk' => $disk,
                    'path' => $file->store("subcontract-valuations/{$valuation->id}", $disk),
                    'original_name' => $file->getClientOriginalName(),
                    'mime_type' => $file->getMimeType() ?? 'application/pdf',
                    'size_bytes' => $file->getSize(),
                ]);
            }
        });

        return $this->respond($valuation->fresh());
    }

    /**
     * Stores one line per work item; items left out keep the previous cumulative quantity.
     *
     * @param  array<int, array{subcontract_item_id: int, cumulative_quantity: numeric-string|float}>  $lines
     */
    private function saveLines(SubcontractValuation $valuation, array $lines): void
    {
        $items = $valuation->subcontract->items()->with('variationLines')->get()->keyBy('id');
        $previous = $this->calculator->previousQuantities($valuation->subcontract, $valuation->sequence);
        $submitted = collect($lines)->keyBy('subcontract_item_id');

        foreach (array_keys($submitted->all()) as $itemId) {
            if (! $items->has($itemId)) {
                throw ValidationException::withMessages(['lines' => [__('validation.exists', ['attribute' => 'article'])]]);
            }
        }

        $errors = [];
        foreach (array_values($lines) as $index => $line) {
            $authorized = $items[$line['subcontract_item_id']]->authorizedQuantity();
            if (BigDecimal::of((string) $line['cumulative_quantity'])->isGreaterThan($authorized)) {
                $errors["lines.{$index}.cumulative_quantity"] = [__('validation.subcontract_quantity_exceeds_authorized', [
                    'quantity' => (string) $line['cumulative_quantity'],
                    'authorized' => (string) $authorized->strippedOfTrailingZeros(),
                ])];
            }
        }
        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }

        $valuation->lines()->delete();
        foreach ($items as $itemId => $item) {
            $valuation->lines()->create([
                'subcontract_item_id' => $itemId,
                'cumulative_quantity' => $submitted[$itemId]['cumulative_quantity'] ?? $previous[$itemId] ?? 0,
            ]);
        }
    }

    private function syncPaymentStatus(SubcontractValuation $valuation): void
    {
        $valuation->unsetRelation('payments');
        $paid = $valuation->paidAmount();

        $status = match (true) {
            $paid->isZero() => SubcontractValuation::STATUS_APPROVED,
            $paid->isGreaterThanOrEqualTo((string) $valuation->net_due) => SubcontractValuation::STATUS_PAID,
            default => SubcontractValuation::STATUS_PARTIALLY_PAID,
        };

        $valuation->update([
            'status' => $status,
            'paid_at' => $status === SubcontractValuation::STATUS_PAID ? now() : null,
        ]);
    }

    /**
     * @param  array<int, string>  $from
     * @param  array<string, mixed>  $attributes
     */
    private function transition(Request $request, SubcontractValuation $valuation, array $from, array $attributes): JsonResponse
    {
        $this->authorizeManagement($request);
        $this->ensureStatus($valuation, $from);
        $valuation->update($attributes);

        return $this->respond($valuation);
    }

    /** @param array<int, string> $allowed */
    private function ensureStatus(SubcontractValuation $valuation, array $allowed): void
    {
        if (! in_array($valuation->status, $allowed, true)) {
            throw ValidationException::withMessages(['status' => [__('validation.subcontract_valuation_status')]]);
        }
    }

    private function authorizeManagement(Request $request): void
    {
        abort_unless($request->user()?->role->canManageSubcontracts(), 403);
    }

    private function respond(SubcontractValuation $valuation): JsonResponse
    {
        $valuation->load(['subcontract.subcontractor', 'subcontract.project:id,code,name', 'subcontract.items.variationLines', 'lines', 'documents', 'payments.recorder:id,name', 'approver:id,name']);

        return (new SubcontractValuationResource($valuation))->response();
    }
}

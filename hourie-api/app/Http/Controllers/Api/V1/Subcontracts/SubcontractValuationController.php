<?php

namespace App\Http\Controllers\Api\V1\Subcontracts;

use App\Http\Controllers\Controller;
use App\Http\Requests\Subcontracts\SaveSubcontractValuationRequest;
use App\Http\Requests\Subcontracts\StoreValuationInvoiceRequest;
use App\Http\Requests\Subcontracts\StoreValuationOpeningRequest;
use App\Http\Requests\Subcontracts\StoreValuationPaymentRequest;
use App\Http\Resources\SubcontractValuationResource;
use App\Models\Subcontract;
use App\Models\SubcontractValuation;
use App\Models\SubcontractValuationDocument;
use App\Models\SubcontractValuationPayment;
use App\Services\SubcontractValuationCalculator;
use App\Services\SubcontractValuationPdfService;
use Brick\Math\BigDecimal;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

/**
 * Valuation workflow: draft → submitted → approved → partially paid → paid.
 * The advance and the opening balance of an older contract are approved
 * entries from the start and only go through the payment steps.
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
                'cash_percent' => $subcontract->cash_percent,
                ...$request->safe()->except('lines'),
                'sequence' => $sequence,
                'kind' => SubcontractValuation::KIND_REGULAR,
                'reference' => $subcontract->reference.'-SIT-'.str_pad((string) $sequence, 2, '0', STR_PAD_LEFT),
                'status' => SubcontractValuation::STATUS_DRAFT,
                'created_by_user_id' => $request->user()->id,
            ]);
            $this->saveLines($valuation, $request->validated('lines'));

            return $this->calculator->calculate($valuation);
        });

        return $this->respond($valuation)->setStatusCode(201);
    }

    /**
     * Opening balance of a contract that started before Hourie. It stands for
     * every paper valuation up to the given number: cumulative quantities per
     * work item, plus works certified without a breakdown. It is approved at
     * once, and the payments already made are then recorded against it.
     */
    public function storeOpening(StoreValuationOpeningRequest $request, Subcontract $subcontract): JsonResponse
    {
        if ($subcontract->workValuations()->exists()) {
            throw ValidationException::withMessages(['valuation' => [__('validation.subcontract_opening_not_allowed')]]);
        }

        $valuation = DB::transaction(function () use ($request, $subcontract): SubcontractValuation {
            $subcontract->update(['historical_works_amount' => $request->validated('historical_works_amount')]);
            $sequence = (int) $request->validated('last_sequence');
            $valuation = $subcontract->valuations()->create([
                'sequence' => $sequence,
                'kind' => SubcontractValuation::KIND_OPENING,
                'reference' => $subcontract->reference.'-REPRISE',
                'valuation_date' => $request->validated('valuation_date'),
                'period_end' => $request->validated('period_end'),
                'cash_percent' => $request->validated('cash_percent', $subcontract->cash_percent),
                'materials_deduction' => 0,
                'backcharges' => 0,
                'comment' => $request->validated('comment'),
                'status' => SubcontractValuation::STATUS_APPROVED,
                'created_by_user_id' => $request->user()->id,
                'approved_by_user_id' => $request->user()->id,
                'approved_at' => now(),
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

    /** The company's standard situation document, drawn from the saved amounts. */
    public function pdf(Request $request, SubcontractValuation $valuation, SubcontractValuationPdfService $pdfService): Response
    {
        $filename = $pdfService->filename($valuation);
        $disposition = $request->boolean('preview') ? 'inline' : 'attachment';

        return response($pdfService->render($valuation), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => "{$disposition}; filename=\"{$filename}\"",
            'Cache-Control' => 'private, no-store',
            'X-Content-Type-Options' => 'nosniff',
        ]);
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

        if ($valuation->isOpening()) {
            $this->ensureOpeningCanBeRemoved($valuation);
        } else {
            $this->ensureStatus($valuation, [SubcontractValuation::STATUS_DRAFT]);
        }

        DB::transaction(function () use ($valuation): void {
            $valuation->documents->each(fn (SubcontractValuationDocument $document) => Storage::disk($document->disk)->delete($document->path));
            if ($valuation->isOpening()) {
                $valuation->subcontract->update(['historical_works_amount' => 0]);
            }
            $valuation->delete();
        });

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
        $this->authorizeManagement($request);
        $this->ensureStatus($valuation, [SubcontractValuation::STATUS_SUBMITTED]);
        $this->calculator->calculate($valuation);

        return $this->transition($request, $valuation, [SubcontractValuation::STATUS_SUBMITTED], [
            'status' => SubcontractValuation::STATUS_APPROVED,
            'approved_at' => now(),
            'approved_by_user_id' => $request->user()->id,
        ]);
    }

    /**
     * Records money actually paid to the subcontractor. A valuation can be
     * paid in several payments; it becomes "paid" once they reach its net due.
     * Each channel is checked on its own: cash against the cash part, a cheque
     * or transfer against the cheque part, and the VAT it includes against VAT.
     */
    public function storePayment(StoreValuationPaymentRequest $request, SubcontractValuation $valuation): JsonResponse
    {
        DB::transaction(function () use ($request, $valuation): void {
            $valuation = SubcontractValuation::query()->lockForUpdate()->findOrFail($valuation->id);
            $this->ensureStatus($valuation, [SubcontractValuation::STATUS_APPROVED, SubcontractValuation::STATUS_PARTIALLY_PAID]);

            $expected = $valuation->invoiceExpectedAmount();
            if ($valuation->requiresInvoice() && ($valuation->invoice_amount === null || ! $expected->isEqualTo((string) $valuation->invoice_amount))) {
                throw ValidationException::withMessages(['invoice_amount' => [__('validation.subcontract_invoice_mismatch', [
                    'invoice' => $valuation->invoice_amount ?? '—',
                    'net' => (string) $expected->toScale(2),
                ])]]);
            }

            $amount = BigDecimal::of((string) $request->validated('amount'));
            $vat = BigDecimal::of((string) ($request->validated('vat_amount') ?? '0'));
            $isCash = $request->validated('method') === SubcontractValuationPayment::METHOD_CASH;
            $channels = $valuation->channels();

            if ($isCash && $vat->isPositive()) {
                throw ValidationException::withMessages(['vat_amount' => [__('validation.subcontract_payment_cash_without_vat')]]);
            }
            $this->ensureWithinBalance('amount', 'subcontract_payment_exceeds_cash', $isCash ? $amount : BigDecimal::zero(), $channels['cash']['balance']);
            $this->ensureWithinBalance('amount', 'subcontract_payment_exceeds_cheque', $isCash ? BigDecimal::zero() : $amount->minus($vat), $channels['cheque']['balance']);
            $this->ensureWithinBalance('vat_amount', 'subcontract_payment_exceeds_vat', $vat, $channels['vat']['balance']);

            $valuation->payments()->create([
                ...$request->validated(),
                'vat_amount' => (string) $vat,
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
        abort_unless($valuation->kind === SubcontractValuation::KIND_REGULAR, 422);

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
     * @param  array<int, array{subcontract_item_id: int, cumulative_quantity: numeric-string|float, location?: string|null}>  $lines
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
                'location' => $submitted[$itemId]['location'] ?? null,
            ]);
        }
    }

    private function ensureWithinBalance(string $field, string $message, BigDecimal $amount, BigDecimal $balance): void
    {
        if ($amount->isGreaterThan($balance)) {
            throw ValidationException::withMessages([$field => [__("validation.{$message}", ['balance' => (string) $balance->toScale(2)])]]);
        }
    }

    /** An opening balance can be removed while nothing was paid on it and no situation follows it. */
    private function ensureOpeningCanBeRemoved(SubcontractValuation $valuation): void
    {
        $hasLaterValuations = $valuation->subcontract->workValuations()->where('sequence', '>', $valuation->sequence)->exists();

        if ($valuation->payments()->exists() || $hasLaterValuations) {
            throw ValidationException::withMessages(['status' => [__('validation.subcontract_valuation_status')]]);
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

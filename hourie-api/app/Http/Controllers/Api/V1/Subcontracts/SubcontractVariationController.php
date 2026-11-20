<?php

namespace App\Http\Controllers\Api\V1\Subcontracts;

use App\Http\Controllers\Controller;
use App\Http\Requests\Subcontracts\StoreSubcontractVariationRequest;
use App\Http\Resources\SubcontractResource;
use App\Models\Subcontract;
use App\Services\SubcontractItemCodeGenerator;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SubcontractVariationController extends Controller
{
    /**
     * A variation (avenant) raises the authorised quantity of existing work
     * items and/or adds new priced items to the subcontract.
     */
    public function store(StoreSubcontractVariationRequest $request, Subcontract $subcontract): JsonResponse
    {
        $validated = $request->validated();
        $itemIds = $subcontract->items()->pluck('id');

        foreach ($validated['lines'] ?? [] as $index => $line) {
            if (! $itemIds->contains($line['subcontract_item_id'])) {
                throw ValidationException::withMessages(["lines.{$index}.subcontract_item_id" => [__('validation.exists', ['attribute' => 'article'])]]);
            }
        }

        DB::transaction(function () use ($request, $subcontract, $validated): void {
            $variation = $subcontract->variations()->create([
                'sequence' => ((int) $subcontract->variations()->max('sequence')) + 1,
                'title' => $validated['title'],
                'reason' => $validated['reason'] ?? null,
                'approved_on' => $validated['approved_on'],
                'created_by_user_id' => $request->user()->id,
            ]);

            foreach ($validated['lines'] ?? [] as $line) {
                $variation->lines()->create($line);
            }

            $position = (int) $subcontract->items()->max('position');
            $codes = new SubcontractItemCodeGenerator($subcontract->project);
            foreach ($validated['new_items'] ?? [] as $newItem) {
                $item = $subcontract->items()->create([
                    'variation_id' => $variation->id,
                    'position' => ++$position,
                    'code' => $codes->next(),
                    'description' => $newItem['description'],
                    'unit' => $newItem['unit'],
                    'quantity' => 0,
                    'unit_price' => $newItem['unit_price'],
                ]);
                $variation->lines()->create(['subcontract_item_id' => $item->id, 'quantity' => $newItem['quantity']]);
            }
        });

        $subcontract->load(['subcontractor', 'project:id,code,name', 'items.variationLines', 'items.variation', 'items.materials', 'valuations.lines', 'variations.lines.item']);

        return (new SubcontractResource($subcontract))->response()->setStatusCode(201);
    }
}

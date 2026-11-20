<?php

namespace App\Http\Controllers\Api\V1\Subcontracts;

use App\Http\Controllers\Controller;
use App\Http\Requests\Subcontracts\SaveSubcontractRequest;
use App\Http\Resources\SubcontractResource;
use App\Models\Project;
use App\Models\Subcontract;
use App\Models\SubcontractItem;
use App\Models\SubcontractItemMaterial;
use App\Models\SubcontractValuation;
use App\Services\SubcontractItemCodeGenerator;
use App\Services\SubcontractReferenceGenerator;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class SubcontractController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = $this->withSummaryRelations(Subcontract::query())->latest('id');

        if ($request->filled('project_id')) {
            $query->where('project_id', $request->integer('project_id'));
        }

        if ($request->filled('search')) {
            $search = '%'.$request->string('search')->trim()->toString().'%';
            $query->where(fn (Builder $builder) => $builder
                ->where('reference', 'like', $search)
                ->orWhere('title', 'like', $search)
                ->orWhereHas('subcontractor', fn (Builder $subcontractor) => $subcontractor->where('name', 'like', $search))
                ->orWhereHas('project', fn (Builder $project) => $project->where('name', 'like', $search)));
        }

        return SubcontractResource::collection($query->paginate(max(1, min(100, $request->integer('per_page', 20)))));
    }

    public function store(SaveSubcontractRequest $request, SubcontractReferenceGenerator $referenceGenerator): JsonResponse
    {
        $subcontract = DB::transaction(function () use ($request, $referenceGenerator): Subcontract {
            $validated = $request->validated();
            $items = $validated['items'];
            unset($validated['items']);
            $project = Project::query()->findOrFail($validated['project_id']);

            $subcontract = Subcontract::query()->create([
                ...$validated,
                'reference' => $referenceGenerator->next($project, CarbonImmutable::parse($validated['signed_on'] ?? now())),
                'created_by_user_id' => $request->user()->id,
            ]);
            $this->syncItems($subcontract, $items);

            return $subcontract;
        });

        return (new SubcontractResource($this->loadDetails($subcontract)))->response()->setStatusCode(201);
    }

    /**
     * Next work item code of a site, so forms can show codes before saving.
     * The server assigns the final code when the items are saved.
     */
    public function nextItemCode(Project $project): JsonResponse
    {
        abort_if(blank($project->code), 422, __('validation.project_without_cost_code'));

        return response()->json(['data' => [
            'site_code' => $project->code,
            'next_sequence' => (new SubcontractItemCodeGenerator($project))->upcomingSequence(),
        ]]);
    }

    /**
     * Materials ARH supplies on a site, for linking purchase order lines to work.
     */
    public function siteMaterials(Project $project): JsonResponse
    {
        $materials = SubcontractItemMaterial::query()
            ->whereHas('item', fn ($item) => $item->where('materials_supplied_by', SubcontractItem::SUPPLIED_BY_ARH)
                ->whereHas('subcontract', fn ($subcontract) => $subcontract->where('project_id', $project->id)))
            ->with('item:id,subcontract_id,code,description', 'item.subcontract:id,reference')
            ->get()
            ->map(fn (SubcontractItemMaterial $material) => [
                'id' => $material->id,
                'name' => $material->name,
                'unit' => $material->unit,
                'item_code' => $material->item->code,
                'item_description' => $material->item->description,
                'subcontract_reference' => $material->item->subcontract->reference,
            ])
            ->sortBy('item_code')
            ->values();

        return response()->json(['data' => $materials]);
    }

    public function show(Subcontract $subcontract): SubcontractResource
    {
        return new SubcontractResource($this->loadDetails($subcontract));
    }

    /**
     * The bill of quantities is locked once a variation or valuation exists:
     * later changes must go through a variation so every quantity stays traceable.
     */
    public function update(SaveSubcontractRequest $request, Subcontract $subcontract): SubcontractResource
    {
        DB::transaction(function () use ($request, $subcontract): void {
            $validated = $request->validated();
            $items = $validated['items'];
            unset($validated['items']);

            $subcontract->update($validated);

            if (! $this->itemsAreLocked($subcontract)) {
                $this->syncItems($subcontract, $items);
            } else {
                $this->syncMaterialSettings($subcontract, $items);
            }
        });

        return new SubcontractResource($this->loadDetails($subcontract->fresh()));
    }

    /**
     * A contract can be removed while it only has drafts; once a valuation is
     * approved or paid it is part of the financial record and must be kept.
     */
    public function destroy(Request $request, Subcontract $subcontract): Response
    {
        abort_unless($request->user()?->role->canManageSubcontracts(), 403);

        if ($subcontract->valuations()->whereIn('status', SubcontractValuation::CERTIFIED_STATUSES)->exists()) {
            throw ValidationException::withMessages(['subcontract' => [__('validation.subcontract_has_certified_valuations')]]);
        }

        DB::transaction(function () use ($subcontract): void {
            $subcontract->valuations()->with('documents')->get()->each(function (SubcontractValuation $valuation): void {
                $valuation->documents->each(fn ($document) => Storage::disk($document->disk)->delete($document->path));
            });
            $subcontract->delete();
        });

        return response()->noContent();
    }

    private function itemsAreLocked(Subcontract $subcontract): bool
    {
        return $subcontract->variations()->exists() || $subcontract->valuations()->exists();
    }

    /**
     * Existing items keep their code; new items get the next code of the site.
     *
     * @param  array<int, array<string, mixed>>  $items
     */
    private function syncItems(Subcontract $subcontract, array $items): void
    {
        $keptIds = collect($items)->pluck('id')->filter()->all();
        $subcontract->items()->whereNull('variation_id')->whereNotIn('id', $keptIds)->delete();
        $codes = new SubcontractItemCodeGenerator($subcontract->project);

        foreach (array_values($items) as $index => $item) {
            $attributes = [
                'position' => $index + 1,
                'description' => $item['description'],
                'unit' => $item['unit'],
                'quantity' => $item['quantity'],
                'unit_price' => $item['unit_price'],
            ];
            $existing = isset($item['id']) ? $subcontract->items()->whereNull('variation_id')->find($item['id']) : null;
            $saved = $existing
                ? tap($existing)->update($attributes)
                : $subcontract->items()->create([...$attributes, 'code' => $codes->next()]);
            $this->syncMaterials($saved, $item);
        }
    }

    /**
     * Who supplies the materials and their consumption stay editable after the
     * bill of quantities is locked: they do not change any amount paid.
     *
     * @param  array<int, array<string, mixed>>  $items
     */
    private function syncMaterialSettings(Subcontract $subcontract, array $items): void
    {
        foreach ($items as $item) {
            $existing = isset($item['id']) ? $subcontract->items()->find($item['id']) : null;
            if ($existing) {
                $this->syncMaterials($existing, $item);
            }
        }
    }

    /** @param array<string, mixed> $input */
    private function syncMaterials(SubcontractItem $item, array $input): void
    {
        $suppliedBy = $input['materials_supplied_by'] ?? $item->materials_supplied_by ?? SubcontractItem::SUPPLIED_BY_SUBCONTRACTOR;
        $item->update(['materials_supplied_by' => $suppliedBy]);
        $materials = $suppliedBy === SubcontractItem::SUPPLIED_BY_ARH ? ($input['materials'] ?? []) : [];

        $item->materials()->whereNotIn('id', collect($materials)->pluck('id')->filter()->all())->delete();
        foreach ($materials as $material) {
            $attributes = collect($material)->only(['name', 'unit', 'quantity_per_unit', 'waste_percent'])->all();
            $existing = isset($material['id']) ? $item->materials()->find($material['id']) : null;
            $existing ? $existing->update($attributes) : $item->materials()->create($attributes);
        }
    }

    /**
     * @param  Builder<Subcontract>  $query
     * @return Builder<Subcontract>
     */
    private function withSummaryRelations(Builder $query): Builder
    {
        return $query->with(['subcontractor', 'project:id,code,name', 'items.variationLines', 'items.variation', 'valuations.lines']);
    }

    private function loadDetails(Subcontract $subcontract): Subcontract
    {
        return $subcontract->load(['subcontractor', 'project:id,code,name', 'items.variationLines', 'items.variation', 'items.materials', 'valuations.lines', 'variations.lines.item']);
    }
}

<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\CatalogOption;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CatalogOptionController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['data' => CatalogOption::query()->orderBy('group')->orderBy('sort_order')->orderBy('label_fr')->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()->role->canManageSites(), 403);
        $option = CatalogOption::query()->create($this->validated($request));

        return response()->json(['data' => $option], 201);
    }

    public function update(Request $request, CatalogOption $catalogOption): JsonResponse
    {
        abort_unless($request->user()->role->canManageSites(), 403);
        $catalogOption->update($this->validated($request, $catalogOption));

        return response()->json(['data' => $catalogOption->fresh()]);
    }

    public function destroy(Request $request, CatalogOption $catalogOption): JsonResponse
    {
        abort_unless($request->user()->role->canManageSites(), 403);
        $catalogOption->update(['is_active' => false]);

        return response()->json(status: 204);
    }

    /** @return array<string, mixed> */
    private function validated(Request $request, ?CatalogOption $option = null): array
    {
        $groups = ['equipment_condition', 'operational_situation', 'maintenance_type', 'fuel_type', 'project_status'];

        return $request->validate([
            'group' => ['required', Rule::in($option === null ? $groups : [$option->group])],
            'code' => ['required', 'string', 'max:80', 'regex:/^[A-Za-z0-9_-]+$/', ...($option === null ? [] : [Rule::in([$option->code])]), Rule::unique('catalog_options')->where('group', $request->input('group'))->ignore($option)],
            'label_fr' => ['required', 'string', 'max:255'],
            'label_ar' => ['nullable', 'string', 'max:255'],
            'color' => ['nullable', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'sort_order' => ['required', 'integer', 'min:0', 'max:999'],
            'is_active' => ['required', 'boolean'],
        ]);
    }
}

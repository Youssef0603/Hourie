<?php

namespace App\Http\Controllers\Api\V1\Subcontracts;

use App\Http\Controllers\Controller;
use App\Http\Requests\Subcontracts\SaveSubcontractorRequest;
use App\Models\Subcontractor;
use Illuminate\Http\JsonResponse;

class SubcontractorController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => Subcontractor::query()->where('is_active', true)->orderBy('name')
                ->get(['id', 'name', 'contact_name', 'phone', 'email', 'tax_number']),
        ]);
    }

    public function store(SaveSubcontractorRequest $request): JsonResponse
    {
        $subcontractor = Subcontractor::query()->create($request->validated());

        return response()->json(['data' => $subcontractor->only(['id', 'name', 'contact_name', 'phone', 'email', 'tax_number'])], 201);
    }

    public function update(SaveSubcontractorRequest $request, Subcontractor $subcontractor): JsonResponse
    {
        $subcontractor->update($request->validated());

        return response()->json(['data' => $subcontractor->only(['id', 'name', 'contact_name', 'phone', 'email', 'tax_number'])]);
    }
}

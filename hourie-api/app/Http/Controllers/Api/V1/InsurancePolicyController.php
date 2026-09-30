<?php

namespace App\Http\Controllers\Api\V1;

use App\Actions\Insurance\SendInsuranceExpiryReminders;
use App\Http\Controllers\Controller;
use App\Http\Requests\Insurance\StoreInsurancePolicyDocumentsRequest;
use App\Http\Requests\Insurance\StoreInsurancePolicyRequest;
use App\Http\Requests\Insurance\UpdateInsurancePolicyRequest;
use App\Http\Resources\InsurancePolicyResource;
use App\Models\Equipment;
use App\Models\InsurancePolicy;
use App\Models\InsurancePolicyDocument;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class InsurancePolicyController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = InsurancePolicy::query()->with(['project:id,name', 'employees:id,name', 'equipment:id,asset_code,brand,model', 'documents'])->latest('ends_on')->latest('id');
        if ($request->filled('insurance_type')) {
            $query->where('insurance_type', $request->string('insurance_type')->toString());
        }

        return InsurancePolicyResource::collection($query->get());
    }

    public function equipmentOptions(Request $request): JsonResponse
    {
        abort_unless($request->user()?->role->canManageSites(), 403);

        $equipment = Equipment::query()
            ->where('is_active', true)
            ->with('category:id,code,name')
            ->get(['id', 'equipment_category_id', 'asset_code', 'brand', 'model', 'asset_details'])
            ->filter(fn (Equipment $item) => in_array($item->category?->code, ['car', 'truck_dumper', 'equipment'], true))
            ->map(fn (Equipment $item) => [
                'id' => $item->id,
                'asset_code' => $item->asset_code,
                'name' => trim(implode(' ', array_filter([$item->brand, $item->model]))) ?: $item->asset_code,
                'category_name' => $item->category?->name,
                'chassis_number' => $item->asset_details['chassis_number'] ?? null,
            ])
            ->filter(fn (array $item) => filled($item['chassis_number']))
            ->sortBy(['category_name', 'name', 'asset_code'])
            ->values();

        return response()->json(['data' => $equipment]);
    }

    public function store(StoreInsurancePolicyRequest $request): JsonResponse
    {
        $policy = $this->save(new InsurancePolicy, $request->validated(), $request->user()->id);

        return (new InsurancePolicyResource($policy))->response()->setStatusCode(201);
    }

    public function show(InsurancePolicy $insurancePolicy): InsurancePolicyResource
    {
        return new InsurancePolicyResource($insurancePolicy->load(['project:id,name', 'employees:id,name', 'equipment:id,asset_code,brand,model', 'documents']));
    }

    public function update(UpdateInsurancePolicyRequest $request, InsurancePolicy $insurancePolicy): InsurancePolicyResource
    {
        $policy = $this->save($insurancePolicy, $request->validated());

        return new InsurancePolicyResource($policy);
    }

    public function sendExpiryReminder(Request $request, InsurancePolicy $insurancePolicy, SendInsuranceExpiryReminders $reminders): JsonResponse
    {
        abort_unless($request->user()?->role->canManageSites(), 403);

        return response()->json([
            'data' => [
                'sent' => $reminders->sendForPolicy($insurancePolicy, withinThirtyDays: true),
            ],
        ]);
    }

    public function destroy(Request $request, InsurancePolicy $insurancePolicy): Response
    {
        abort_unless($request->user()->role->canManageSites(), 403);
        $insurancePolicy->delete();

        return response()->noContent();
    }

    public function storeDocuments(StoreInsurancePolicyDocumentsRequest $request, InsurancePolicy $insurancePolicy): JsonResponse
    {
        $disk = (string) config('filesystems.equipment_documents_disk');
        $documents = collect($request->file('documents', []))->map(function ($file) use ($insurancePolicy, $request, $disk): InsurancePolicyDocument {
            $path = $file->store("insurance/{$insurancePolicy->id}/documents", $disk);

            return $insurancePolicy->documents()->create([
                'uploaded_by_user_id' => $request->user()->id,
                'disk' => $disk,
                'path' => $path,
                'original_name' => $file->getClientOriginalName(),
                'mime_type' => $file->getMimeType() ?? 'application/pdf',
                'size_bytes' => $file->getSize(),
            ]);
        });

        return response()->json(['data' => $documents->map(fn (InsurancePolicyDocument $document) => $this->documentData($insurancePolicy, $document))], 201);
    }

    public function showDocument(Request $request, InsurancePolicy $insurancePolicy, InsurancePolicyDocument $document): StreamedResponse
    {
        abort_unless($document->insurance_policy_id === $insurancePolicy->id, 404);

        return Storage::disk($document->disk)->response($document->path, $document->original_name, [
            'Content-Type' => $document->mime_type,
            'Cache-Control' => 'private, no-store',
            'X-Content-Type-Options' => 'nosniff',
        ], 'inline');
    }

    public function destroyDocument(Request $request, InsurancePolicy $insurancePolicy, InsurancePolicyDocument $document): Response
    {
        abort_unless($request->user()?->role->canManageSites(), 403);
        abort_unless($document->insurance_policy_id === $insurancePolicy->id, 404);

        Storage::disk($document->disk)->delete($document->path);
        $document->delete();

        return response()->noContent();
    }

    /** @param array<string, mixed> $data */
    private function save(InsurancePolicy $policy, array $data, ?int $createdBy = null): InsurancePolicy
    {
        return DB::transaction(function () use ($policy, $data, $createdBy): InsurancePolicy {
            $employeeIds = $data['employee_ids'] ?? null;
            $equipmentIds = $data['equipment_ids'] ?? null;
            $chassisNumbers = $data['chassis_numbers'] ?? null;
            unset($data['employee_ids'], $data['equipment_ids'], $data['chassis_numbers']);

            if (($data['insurance_type'] ?? $policy->insurance_type) !== 'trc_rc') {
                $data['project_id'] = null;
            }

            // A policy total is never typed manually: it is the sum shown on the insurer document.
            $financialFields = ['net_premium', 'accessories_amount', 'tax_amount'];
            $financialValues = [];
            foreach ($financialFields as $field) {
                $financialValues[$field] = array_key_exists($field, $data)
                    ? (float) ($data[$field] ?? 0)
                    : (float) ($policy->{$field} ?? 0);
                if (! $policy->exists || array_key_exists($field, $data)) {
                    $data[$field] = $financialValues[$field];
                }
            }
            $data['total_amount'] = array_sum($financialValues);
            if ($createdBy !== null) {
                $data['created_by_user_id'] = $createdBy;
            }
            $policy->fill($data)->save();
            if ($employeeIds !== null) {
                $policy->employees()->sync($employeeIds);
            }
            if ($chassisNumbers !== null) {
                $equipmentIds = array_values(array_unique([
                    ...($equipmentIds ?? []),
                    ...$this->equipmentIdsForChassisNumbers($chassisNumbers),
                ]));
            }
            if ($equipmentIds !== null) {
                $policy->equipment()->sync($equipmentIds);
            }

            return $policy->fresh()->load(['project:id,name', 'employees:id,name', 'equipment:id,asset_code,brand,model', 'documents']);
        });
    }

    private function documentData(InsurancePolicy $policy, InsurancePolicyDocument $document): array
    {
        return ['id' => $document->id, 'original_name' => $document->original_name, 'mime_type' => $document->mime_type, 'size_bytes' => $document->size_bytes, 'url' => "/api/v1/insurance-policies/{$policy->id}/documents/{$document->id}/file"];
    }

    /** @param array<int, string> $chassisNumbers @return array<int, int> */
    private function equipmentIdsForChassisNumbers(array $chassisNumbers): array
    {
        $wanted = collect($chassisNumbers)
            ->map(fn (string $number) => $this->normalizeChassisNumber($number))
            ->filter()
            ->unique();

        if ($wanted->isEmpty()) {
            return [];
        }

        return Equipment::query()
            ->whereHas('category', fn ($query) => $query->whereIn('code', ['car', 'truck_dumper']))
            ->get(['id', 'asset_details'])
            ->filter(fn (Equipment $equipment) => $wanted->contains($this->normalizeChassisNumber((string) ($equipment->asset_details['chassis_number'] ?? ''))))
            ->pluck('id')
            ->all();
    }

    private function normalizeChassisNumber(string $value): string
    {
        return strtoupper((string) preg_replace('/[^A-Z0-9]/i', '', $value));
    }
}

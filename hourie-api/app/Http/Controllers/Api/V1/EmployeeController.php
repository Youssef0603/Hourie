<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Employees\StoreEmployeeRequest;
use App\Http\Requests\Employees\UpdateEmployeeRequest;
use App\Http\Resources\EmployeeResource;
use App\Models\Employee;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class EmployeeController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        $employees = Employee::query()
            ->with('user:id,email,role')
            ->withCount('equipmentInCustody')
            ->orderBy('name')
            ->get(['id', 'user_id', 'name', 'phone_number', 'is_active']);

        return EmployeeResource::collection($employees);
    }

    public function store(StoreEmployeeRequest $request): JsonResponse
    {
        $data = $request->validated();

        $employee = DB::transaction(function () use ($data): Employee {
            $user = User::query()->create([
                'name' => $data['name'],
                'email' => $data['email'],
                'role' => $data['role'],
                'password' => $data['password'],
            ]);

            return Employee::query()->create([
                'user_id' => $user->id,
                'name' => $data['name'],
                'phone_number' => $data['phone_number'] ?? null,
                'is_active' => true,
            ]);
        });

        $employee->load('user:id,email,role')->loadCount('equipmentInCustody');

        return (new EmployeeResource($employee))->response()->setStatusCode(201);
    }

    public function show(Employee $employee): EmployeeResource
    {
        $employee->load([
            'user:id,email,role',
            'equipmentInCustody.category',
            'equipmentInCustody.currentLocation.parent',
            'equipmentInCustody.currentLocation.project',
            'equipmentInCustody.currentProjectAssignment.project',
            'equipmentInCustody.custodian',
            'equipmentInCustody.generatorDetails',
        ])->loadCount('equipmentInCustody');

        return new EmployeeResource($employee);
    }

    public function update(UpdateEmployeeRequest $request, Employee $employee): EmployeeResource
    {
        $data = $request->validated();

        DB::transaction(function () use ($data, $employee): void {
            $employee->update([
                'name' => $data['name'],
                'phone_number' => $data['phone_number'] ?? null,
            ]);

            $accountData = [
                'name' => $data['name'],
                'email' => $data['email'] ?? null,
                'role' => $data['role'] ?? UserRole::Viewer,
            ];

            if (filled($data['password'] ?? null)) {
                $accountData['password'] = $data['password'];
            }

            if ($employee->user_id !== null) {
                $employee->user()->update($accountData);
            } elseif (filled($data['email'] ?? null)) {
                $accountData['password'] = $data['password'];
                $user = User::query()->create($accountData);
                $employee->update(['user_id' => $user->id]);
            }
        });

        return $this->show($employee->fresh());
    }
}

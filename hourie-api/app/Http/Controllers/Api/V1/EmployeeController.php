<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Employees\StoreEmployeeRequest;
use App\Http\Requests\Employees\UpdateEmployeeRequest;
use App\Http\Resources\EmployeeResource;
use App\Models\Employee;
use App\Models\Equipment;
use App\Models\Project;
use App\Models\ProjectChange;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class EmployeeController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        $employees = Employee::query()
            ->where('is_active', true)
            ->with('user:id,username,email,role')
            ->orderBy('name')
            ->get(['id', 'user_id', 'name', 'phone_number', 'passport_number', 'employment_date', 'is_active']);

        $responsibilityCounts = Equipment::query()
            ->leftJoin('equipment_project_assignments', function ($join): void {
                $join
                    ->on('equipment.id', '=', 'equipment_project_assignments.equipment_id')
                    ->whereNull('equipment_project_assignments.ended_at');
            })
            ->leftJoin('projects', 'projects.id', '=', 'equipment_project_assignments.project_id')
            ->where('equipment.is_active', true)
            ->where(function ($query): void {
                $query->whereNotNull('equipment.custodian_employee_id')
                    ->orWhereNotNull('projects.responsible_employee_id');
            })
            ->selectRaw('COALESCE(equipment.custodian_employee_id, projects.responsible_employee_id) as responsible_employee_id, COUNT(DISTINCT equipment.id) as aggregate')
            ->groupByRaw('COALESCE(equipment.custodian_employee_id, projects.responsible_employee_id)')
            ->pluck('aggregate', 'responsible_employee_id');

        $employees->each(fn (Employee $employee) => $employee->setAttribute(
            'equipment_in_custody_count',
            (int) ($responsibilityCounts[$employee->id] ?? 0),
        ));

        return EmployeeResource::collection($employees);
    }

    public function store(StoreEmployeeRequest $request): JsonResponse
    {
        $data = $request->validated();

        $employee = DB::transaction(function () use ($data): Employee {
            $user = null;

            if ($data['create_account']) {
                $user = User::query()->create([
                    'name' => $data['name'],
                    'username' => $this->generateUsername($data['name']),
                    'email' => $data['email'] ?? null,
                    'role' => $data['role'],
                    'password' => $data['password'],
                    'must_change_password' => true,
                ]);
            }

            return Employee::query()->create([
                'user_id' => $user?->id,
                'name' => $data['name'],
                'phone_number' => $data['phone_number'] ?? null,
                'passport_number' => $data['passport_number'] ?? null,
                'employment_date' => $data['employment_date'] ?? null,
                'is_active' => true,
            ]);
        });

        $employee->load('user:id,username,email,role')->loadCount('equipmentInCustody');

        return (new EmployeeResource($employee))->response()->setStatusCode(201);
    }

    public function show(Employee $employee): EmployeeResource
    {
        $employee->load([
            'user:id,username,email,role',
            'responsibleProjects:id,name,responsible_employee_id,is_active',
        ]);
        $equipment = Equipment::query()
            ->effectiveResponsible($employee->id)
            ->with([
                'category',
                'currentLocation.parent',
                'currentLocation.project',
                'currentProjectAssignment.project.responsible:id,name',
                'custodian',
                'generatorDetails',
            ])
            ->orderBy('asset_code')
            ->get();
        $employee->setRelation('equipmentInCustody', $equipment);
        $employee->setAttribute('equipment_in_custody_count', $equipment->count());

        return new EmployeeResource($employee);
    }

    public function update(UpdateEmployeeRequest $request, Employee $employee): EmployeeResource
    {
        $data = $request->validated();

        DB::transaction(function () use ($data, $employee): void {
            $employee->update([
                'name' => $data['name'],
                'phone_number' => $data['phone_number'] ?? null,
                'passport_number' => $data['passport_number'] ?? null,
                'employment_date' => $data['employment_date'] ?? null,
            ]);

            $accountData = [
                'name' => $data['name'],
                'username' => $data['username'] ?? null,
                'email' => $data['email'] ?? null,
                'role' => $data['role'] ?? UserRole::Viewer,
            ];

            if (filled($data['password'] ?? null)) {
                $accountData['password'] = $data['password'];
                $accountData['must_change_password'] = true;
            }

            if ($employee->user_id !== null) {
                $employee->user()->update($accountData);
            } elseif (filled($data['username'] ?? null)) {
                $accountData['password'] = $data['password'];
                $accountData['must_change_password'] = true;
                $user = User::query()->create($accountData);
                $employee->update(['user_id' => $user->id]);
            }
        });

        return $this->show($employee->fresh());
    }

    public function destroy(Request $request, Employee $employee): Response
    {
        abort_unless($request->user()->role->canManageUsers(), 403);
        abort_if(
            ! $request->user()->role->canManageManagerAccounts()
            && $employee->user?->role === UserRole::Manager,
            403,
        );
        abort_if($employee->user_id === $request->user()->id, 422, __('users.cannot_delete_self'));

        DB::transaction(function () use ($employee, $request): void {
            $projects = Project::query()
                ->where('responsible_employee_id', $employee->id)
                ->get();

            foreach ($projects as $project) {
                $project->update(['responsible_employee_id' => null]);
                ProjectChange::query()->create([
                    'project_id' => $project->id,
                    'actor_user_id' => $request->user()->id,
                    'action' => 'updated',
                    'previous_values' => ['responsible_employee_id' => $employee->id],
                    'new_values' => ['responsible_employee_id' => null],
                    'occurred_at' => now(),
                ]);
            }

            $employee->equipmentInCustody()->update(['custodian_employee_id' => null]);
            $employee->update(['is_active' => false]);
            $employee->user?->update(['is_active' => false]);
        });

        return response()->noContent();
    }

    private function generateUsername(string $name): string
    {
        $base = Str::limit(Str::slug($name, '.'), 44, '');
        $base = $base !== '' ? $base : 'utilisateur';
        $username = $base;
        $suffix = 2;

        while (User::query()->where('username', $username)->exists()) {
            $username = Str::limit($base, 50 - strlen((string) $suffix), '').$suffix;
            $suffix++;
        }

        return $username;
    }
}

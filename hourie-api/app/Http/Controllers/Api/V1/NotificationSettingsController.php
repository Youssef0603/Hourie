<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ApplicationSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class NotificationSettingsController extends Controller
{
    public function show(): JsonResponse
    {
        return response()->json(['data' => [
            'recipients' => ApplicationSetting::reminderRecipientEmployees()->map(fn ($employee) => [
                'employee_id' => $employee->id,
                'name' => $employee->name,
                'email' => $employee->email,
            ])->values(),
        ]]);
    }

    public function update(Request $request): JsonResponse
    {
        abort_unless($request->user()?->role->canManageSites(), 403);
        $data = $request->validate([
            'employee_ids' => ['array', 'max:20'],
            'employee_ids.*' => [
                'integer',
                'distinct',
                Rule::exists('employees', 'id')->where(fn ($query) => $query
                    ->where('is_active', true)
                    ->whereNotNull('email')),
            ],
        ]);
        ApplicationSetting::query()->updateOrCreate(
            ['key' => 'reminder_recipient_employee_ids'],
            ['value' => array_values($data['employee_ids'] ?? [])],
        );

        return $this->show();
    }
}

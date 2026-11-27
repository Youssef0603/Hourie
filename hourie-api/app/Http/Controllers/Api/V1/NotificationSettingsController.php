<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ApplicationSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class NotificationSettingsController extends Controller
{
    public function show(): JsonResponse
    {
        $topics = ApplicationSetting::reminderTopicsByEmployee();

        return response()->json(['data' => [
            'topics' => ApplicationSetting::REMINDER_TOPICS,
            'recipients' => ApplicationSetting::reminderRecipientEmployees()->map(fn ($employee) => [
                'employee_id' => $employee->id,
                'name' => $employee->name,
                'email' => $employee->email,
                'topics' => $topics[$employee->id] ?? ApplicationSetting::REMINDER_TOPICS,
            ])->values(),
            // Automatic: every active Directeur général with an e-mail address, for every kind.
            'escalation_recipients' => ApplicationSetting::reminderEscalationEmployees()->map(fn ($employee) => [
                'employee_id' => $employee->id,
                'name' => $employee->name,
                'email' => $employee->email,
            ])->values(),
        ]]);
    }

    /**
     * Saves the recipients and, for each one, the kinds of reminder they receive.
     */
    public function update(Request $request): JsonResponse
    {
        abort_unless($request->user()?->role->canManageSites(), 403);
        $data = $request->validate([
            'recipients' => ['present', 'array', 'max:20'],
            'recipients.*.employee_id' => [
                'required',
                'integer',
                'distinct',
                Rule::exists('employees', 'id')->where(fn ($query) => $query
                    ->where('is_active', true)
                    ->whereNotNull('email')),
            ],
            'recipients.*.topics' => ['present', 'array'],
            // No "distinct" here: it compares every person's types together, so two
            // people with "Assurances" would be refused. Repeats are dropped below.
            'recipients.*.topics.*' => ['string', Rule::in(ApplicationSetting::REMINDER_TOPICS)],
        ]);
        $recipients = collect($data['recipients']);

        DB::transaction(function () use ($recipients): void {
            ApplicationSetting::query()->updateOrCreate(
                ['key' => 'reminder_recipient_employee_ids'],
                ['value' => $recipients->pluck('employee_id')->map(fn ($id): int => (int) $id)->values()->all()],
            );
            ApplicationSetting::query()->updateOrCreate(
                ['key' => 'reminder_recipient_topics'],
                ['value' => $recipients->mapWithKeys(fn (array $recipient): array => [
                    (string) $recipient['employee_id'] => array_values(array_unique($recipient['topics'])),
                ])->all()],
            );
        });

        return $this->show();
    }
}

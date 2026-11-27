<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;

class ApplicationSetting extends Model
{
    /** The kinds of reminder e-mail; each recipient chooses which ones they receive. */
    public const REMINDER_TOPICS = ['insurance', 'bond', 'temporary_admission', 'car_inspection'];

    protected $fillable = ['key', 'value'];

    protected function casts(): array
    {
        return ['value' => 'array'];
    }

    /**
     * The reminder kinds each recipient receives, by employee id. A recipient
     * missing from the map receives every kind (the behaviour before kinds).
     *
     * @return array<int, list<string>>
     */
    public static function reminderTopicsByEmployee(): array
    {
        $stored = static::query()->where('key', 'reminder_recipient_topics')->value('value');

        return collect(is_array($stored) ? $stored : [])
            ->mapWithKeys(fn ($topics, $employeeId): array => [(int) $employeeId => array_values(array_intersect(self::REMINDER_TOPICS, is_array($topics) ? $topics : []))])
            ->all();
    }

    /** @return list<string> */
    public static function reminderTopicsFor(int $employeeId): array
    {
        return static::reminderTopicsByEmployee()[$employeeId] ?? self::REMINDER_TOPICS;
    }

    /**
     * The standard recipients, optionally only those who receive one kind of reminder.
     *
     * @return Collection<int, Employee>
     */
    public static function reminderRecipientEmployees(?string $topic = null): Collection
    {
        $employees = static::standardRecipientEmployees();
        if ($topic === null) {
            return $employees;
        }
        $topics = static::reminderTopicsByEmployee();

        return $employees
            ->filter(fn (Employee $employee): bool => in_array($topic, $topics[$employee->id] ?? self::REMINDER_TOPICS, true))
            ->values();
    }

    /** @return Collection<int, Employee> */
    private static function standardRecipientEmployees(): Collection
    {
        $setting = static::query()->where('key', 'reminder_recipient_employee_ids')->first();
        if ($setting === null) {
            $legacyEmails = static::query()->where('key', 'reminder_recipients')->value('value');

            return Employee::query()
                ->where('is_active', true)
                ->whereIn('email', is_array($legacyEmails) ? $legacyEmails : [])
                ->orderBy('name')
                ->get(['id', 'name', 'email']);
        }

        $ids = collect($setting->value)
            ->filter(fn ($id): bool => is_int($id) || ctype_digit((string) $id))
            ->map(fn ($id): int => (int) $id)
            ->unique()
            ->values();

        $employees = Employee::query()
            ->whereIn('id', $ids)
            ->where('is_active', true)
            ->whereNotNull('email')
            ->get(['id', 'name', 'email'])
            ->keyBy('id');

        return $ids->map(fn (int $id) => $employees->get($id))->filter()->values();
    }

    /**
     * E-mail addresses for a reminder; with a topic, only the recipients who
     * receive that kind of reminder.
     *
     * @return array<int, string>
     */
    public static function reminderRecipients(bool $includeEscalationRecipient = false, ?string $topic = null): array
    {
        if (static::query()->where('key', 'reminder_recipient_employee_ids')->exists()) {
            $recipients = static::reminderRecipientEmployees($topic)
                ->pluck('email')
                ->filter(fn ($email) => is_string($email) && filter_var($email, FILTER_VALIDATE_EMAIL))
                ->unique()
                ->values()
                ->all();
        } else {
            $stored = static::query()->where('key', 'reminder_recipients')->value('value');
            $fallback = config('mail.inspection_reminder_recipients', []);

            $recipients = collect(is_array($stored) ? $stored : $fallback)
                ->filter(fn ($email) => is_string($email) && filter_var($email, FILTER_VALIDATE_EMAIL))
                ->unique()
                ->values()
                ->all();
        }

        if (! $includeEscalationRecipient) {
            return $recipients;
        }

        return collect([...$recipients, ...static::reminderEscalationEmployees()->pluck('email')->all()])
            ->filter(fn ($email) => is_string($email) && filter_var($email, FILTER_VALIDATE_EMAIL))
            ->unique()
            ->values()
            ->all();
    }

    /** Job title of the people added to the reminders from the 4th one on. */
    public const ESCALATION_JOB_TITLE = 'general_manager';

    /**
     * People who receive the reminders from the 4th one on, on top of the
     * standard list: every active Directeur général with an e-mail address.
     *
     * @return Collection<int, Employee>
     */
    public static function reminderEscalationEmployees(): Collection
    {
        return Employee::query()
            ->where('job_title', self::ESCALATION_JOB_TITLE)
            ->where('is_active', true)
            ->whereNotNull('email')
            ->where('email', '!=', '')
            ->orderBy('name')
            ->get(['id', 'name', 'email']);
    }

    /** @return array<int, string> */
    public static function reminderRecipientsFor(Model $reminder, string $ownerColumn, string $deadlineColumn, ?string $topic = null): array
    {
        $previouslySent = $reminder->newQuery()
            ->where($ownerColumn, $reminder->getAttribute($ownerColumn))
            ->whereDate($deadlineColumn, $reminder->getAttribute($deadlineColumn))
            ->whereNotNull('sent_at')
            ->count();

        return static::reminderRecipients(includeEscalationRecipient: $previouslySent >= 3, topic: $topic);
    }
}

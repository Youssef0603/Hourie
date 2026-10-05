<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;

class ApplicationSetting extends Model
{
    protected $fillable = ['key', 'value'];

    protected function casts(): array
    {
        return ['value' => 'array'];
    }

    /** @return Collection<int, Employee> */
    public static function reminderRecipientEmployees(): Collection
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

    /** @return array<int, string> */
    public static function reminderRecipients(): array
    {
        if (static::query()->where('key', 'reminder_recipient_employee_ids')->exists()) {
            return static::reminderRecipientEmployees()
                ->pluck('email')
                ->filter(fn ($email) => is_string($email) && filter_var($email, FILTER_VALIDATE_EMAIL))
                ->unique()
                ->values()
                ->all();
        }

        $stored = static::query()->where('key', 'reminder_recipients')->value('value');
        $fallback = config('mail.inspection_reminder_recipients', []);

        return collect(is_array($stored) ? $stored : $fallback)->filter(fn ($email) => is_string($email) && filter_var($email, FILTER_VALIDATE_EMAIL))->unique()->values()->all();
    }
}

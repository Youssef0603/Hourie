<?php

namespace App\Http\Requests\TollBadges;

use App\Models\TollBadge;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveTollBadgeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role->canManageEquipment() ?? false;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        $badge = $this->route('tollBadge');

        return [
            'operator' => ['required', Rule::in(TollBadge::OPERATORS)],
            'badge_number' => [
                'required', 'string', 'max:40',
                Rule::unique('toll_badges', 'badge_number')
                    ->where('operator', $this->input('operator'))
                    ->ignore($badge instanceof TollBadge ? $badge->id : null),
            ],
            'serial_number' => ['nullable', 'string', 'max:60'],
            'subscription_number' => ['nullable', 'string', 'max:40'],
            'registered_phone' => ['nullable', 'string', 'max:40'],
            'status' => ['required', Rule::in(TollBadge::STATUSES)],
            'balance' => ['nullable', 'numeric', 'min:0', 'max:9999999999999'],
            'balance_checked_on' => ['nullable', 'date_format:Y-m-d', 'before_or_equal:today'],
            'notes' => ['nullable', 'string', 'max:5000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'badge_number.unique' => __('validation.toll_badge_exists'),
        ];
    }
}

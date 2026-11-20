<?php

namespace App\Rules;

use App\Models\Project;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Translation\PotentiallyTranslatedString;

/**
 * Documents numbered by site (BC-821-…, SC-821-…) need the site's cost code.
 */
class ProjectHasCostCode implements ValidationRule
{
    /**
     * @param  Closure(string, ?string=): PotentiallyTranslatedString  $fail
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (blank(Project::query()->whereKey($value)->value('code'))) {
            $fail(__('validation.project_without_cost_code'));
        }
    }
}

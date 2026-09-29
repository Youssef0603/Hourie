<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['insurance_type', 'policy_number', 'starts_on', 'ends_on', 'net_premium', 'accessories_amount', 'tax_amount', 'policy_cost', 'total_amount', 'coverage_amount', 'invoice_number', 'territory', 'insured_situation', 'project_id', 'source', 'notes', 'created_by_user_id'])]
class InsurancePolicy extends Model
{
    public const TYPES = ['trc_rc', 'individual_accident', 'group_health', 'equipment'];

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function documents(): HasMany
    {
        return $this->hasMany(InsurancePolicyDocument::class);
    }

    public function employees(): BelongsToMany
    {
        return $this->belongsToMany(Employee::class, 'insurance_policy_employees');
    }

    public function equipment(): BelongsToMany
    {
        return $this->belongsToMany(Equipment::class, 'insurance_policy_equipment');
    }

    protected function casts(): array
    {
        return [
            'starts_on' => 'date:Y-m-d', 'ends_on' => 'date:Y-m-d',
            'net_premium' => 'decimal:2', 'accessories_amount' => 'decimal:2', 'tax_amount' => 'decimal:2',
            'policy_cost' => 'decimal:2', 'total_amount' => 'decimal:2', 'coverage_amount' => 'decimal:2',
        ];
    }
}

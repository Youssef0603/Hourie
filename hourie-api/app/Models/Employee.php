<?php

namespace App\Models;

use Database\Factories\EmployeeFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['user_id', 'name', 'phone_number', 'email', 'passport_number', 'employment_date', 'birth_date', 'is_active'])]
class Employee extends Model
{
    /** @use HasFactory<EmployeeFactory> */
    use HasFactory;

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function equipmentInCustody(): HasMany
    {
        return $this->hasMany(Equipment::class, 'custodian_employee_id');
    }

    public function responsibleProjects(): HasMany
    {
        return $this->hasMany(Project::class, 'responsible_employee_id');
    }

    public function insurancePolicies(): BelongsToMany
    {
        return $this->belongsToMany(InsurancePolicy::class, 'insurance_policy_employees');
    }

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'employment_date' => 'date',
            'birth_date' => 'date',
        ];
    }
}

<?php

namespace Database\Factories;

use App\Models\Project;
use App\Models\Subcontract;
use App\Models\Subcontractor;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Subcontract>
 */
class SubcontractFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'reference' => 'SC-'.fake()->unique()->numerify('###-26-##'),
            'subcontractor_id' => Subcontractor::factory(),
            'project_id' => Project::factory(),
            'created_by_user_id' => User::factory(),
            'title' => 'Ferraillage',
            'vat_rate' => 0,
            'retention_rate' => 10,
            'advance_amount' => 0,
            'advance_recovery_rate' => 0,
            'currency' => 'XOF',
            'status' => 'active',
        ];
    }
}

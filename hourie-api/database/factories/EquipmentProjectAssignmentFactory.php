<?php

namespace Database\Factories;

use App\Models\Equipment;
use App\Models\EquipmentProjectAssignment;
use App\Models\Project;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<EquipmentProjectAssignment>
 */
class EquipmentProjectAssignmentFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'equipment_id' => Equipment::factory(),
            'project_id' => Project::factory(),
            'assigned_by_user_id' => null,
            'equipment_import_id' => null,
            'assigned_at' => now(),
            'ended_at' => null,
            'reason' => null,
        ];
    }
}

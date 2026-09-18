<?php

namespace Database\Factories;

use App\Models\Equipment;
use App\Models\EquipmentMaintenance;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<EquipmentMaintenance> */
class EquipmentMaintenanceFactory extends Factory
{
    public function definition(): array
    {
        return [
            'equipment_id' => Equipment::factory(),
            'technician_employee_id' => null,
            'created_by_user_id' => User::factory(),
            'maintenance_date' => fake()->date(),
            'engine_hours' => fake()->randomFloat(2, 0, 20000),
            'intervention_type' => 'mechanical',
            'oil_changed' => true,
            'oil_quantity_litres' => 18.5,
            'oil_filter_changed' => true,
            'fuel_filter_changed' => true,
            'air_filter_changed' => false,
            'battery_serviced' => true,
            'coolant_serviced' => true,
            'technician_name' => fake()->name(),
            'next_maintenance_date' => '2027-03-15',
            'cost' => 125000,
            'cost_currency' => 'XOF',
            'observations' => 'Entretien préventif terminé.',
        ];
    }
}

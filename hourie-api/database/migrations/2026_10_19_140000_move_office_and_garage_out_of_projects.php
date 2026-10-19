<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table): void {
            $table->foreignId('company_location_id')
                ->nullable()
                ->after('birth_date')
                ->constrained('locations')
                ->nullOnDelete();
        });

        $companyLocations = DB::table('locations')
            ->whereNull('project_id')
            ->where('location_type', 'company_location')
            ->whereIn(DB::raw('UPPER(name)'), ['BUREAU', 'GARAGE'])
            ->get()
            ->keyBy(fn ($location) => mb_strtoupper($location->name));

        $falseProjects = DB::table('projects')
            ->whereIn(DB::raw('UPPER(name)'), ['BUREAU', 'GARAGE'])
            ->get();

        foreach ($falseProjects as $project) {
            $location = $companyLocations->get(mb_strtoupper($project->name));

            if ($location !== null) {
                $employeeIds = DB::table('employee_project_assignments')
                    ->where('project_id', $project->id)
                    ->pluck('employee_id');

                DB::table('employees')
                    ->whereIn('id', $employeeIds)
                    ->update([
                        'company_location_id' => $location->id,
                        'updated_at' => now(),
                    ]);
            }

            DB::table('employee_project_assignments')
                ->where('project_id', $project->id)
                ->delete();

            DB::table('locations')
                ->where('project_id', $project->id)
                ->update(['is_active' => false, 'updated_at' => now()]);

            DB::table('projects')
                ->where('id', $project->id)
                ->update(['is_active' => false, 'updated_at' => now()]);
        }
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('company_location_id');
        });
    }
};

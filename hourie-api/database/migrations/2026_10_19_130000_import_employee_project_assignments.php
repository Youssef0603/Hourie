<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // This enriches the existing company directory; it is not demo seed data.
        if (! DB::table('employees')->exists()) {
            return;
        }

        $now = now();
        foreach ([
            ['PK27', 'PK27'],
            ['GARAGE', 'Garage'],
        ] as [$code, $name]) {
            DB::table('projects')->updateOrInsert(
                ['name' => $name],
                [
                    'code' => $code,
                    'status' => 'active',
                    'address' => $name,
                    'is_active' => true,
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
            );
        }

        $assignments = [
            [['Samer Khalife', 'Samer khalifeh'], 'Bureau', 'Admin'],
            [['Ramzi Zaarour'], 'Bureau', 'Admin'],
            [['Mohamad Jarad'], 'Gesco', 'Foreman'],
            [['RASHED Al Doghem', 'Rashed Aldoghem'], 'Gesco', 'Foreman'],
            [['Ahmad Yassin'], 'Bassam', 'Foreman'],
            [['Mahmoud Yassin'], 'Bassam', 'Foreman'],
            [['Ramzi Slim'], 'PK27', 'Foreman'],
            [['Ali Alzaher'], 'PK27', 'Foreman'],
            [['Ayid Allahima'], 'Barrage B13', 'Foreman'],
            [['Mohamad Al Sayed'], 'Bassam', 'Foreman'],
            [['Abdallah Moussaa', 'Abdallah Moussa'], 'Garage', 'Garage'],
            [['Ghassan Abu Akl'], 'Gesco', 'Garage'],
            [['Khalil Bourgi'], 'Garage', 'Garage'],
            [['Marwa Jamal'], 'Bassam', 'Ingénieur'],
            [['Jamal Mikkawi'], 'Gesco', 'Ingénieur'],
            [['Hassan Mahdi'], 'Bassam', 'Ingénieur'],
            [['Sami Massoudi'], 'Bassam', 'Ingénieur'],
            [['Zein DAWI', 'Zein Dawi'], 'Bureau', 'Ingénieur'],
            [['Ghazi Laouini'], 'Gesco', 'Topographe'],
            [['Mahmoud Hassan'], 'Bassam', 'Topographe'],
            [['Hani Al Dahesh'], 'Bassam', 'Foreman'],
            [['Mahdi Jaffal'], 'Bassam', 'Ingénieur'],
            [['Iyad Mroueh', 'Iyad Mroue'], 'Abidjan Tower', 'Ingénieur'],
            [['Zahraa Kefel'], 'Abidjan Tower', 'Architecte'],
            [['Wael Zorkot'], 'BX', 'Ingénieur'],
            [['Hassan Baydoun'], 'Bassam', 'Centrale à bitume'],
            [['Mahmoud Mahfoud'], 'PK27', 'Topographe'],
            [['Youssef Yassine', 'Youssef Yassin'], 'Bureau', 'IT'],
        ];

        DB::transaction(function () use ($assignments, $now): void {
            foreach ($assignments as [$aliases, $projectName, $projectRole]) {
                $employee = DB::table('employees')
                    ->whereIn('name', $aliases)
                    ->orderByDesc('is_active')
                    ->orderByDesc('id')
                    ->first();
                $project = DB::table('projects')
                    ->where('name', $projectName)
                    ->orderByDesc('is_active')
                    ->orderByDesc('id')
                    ->first();

                if (! $employee || ! $project) {
                    continue;
                }

                $currentAssignment = DB::table('employee_project_assignments')
                    ->where('employee_id', $employee->id)
                    ->whereNull('ended_on')
                    ->latest('id')
                    ->first();

                $values = [
                    'project_id' => $project->id,
                    'project_role' => $projectRole,
                    'ended_on' => null,
                    'updated_at' => $now,
                ];

                if ($currentAssignment) {
                    DB::table('employee_project_assignments')
                        ->where('id', $currentAssignment->id)
                        ->update($values);
                } else {
                    DB::table('employee_project_assignments')->insert([
                        ...$values,
                        'employee_id' => $employee->id,
                        'started_on' => null,
                        'created_at' => $now,
                    ]);
                }
            }
        });
    }

    public function down(): void
    {
        // Company assignments imported from an authoritative list are retained on rollback.
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // This is an enrichment of the existing company directory, not demo seed data.
        if (! DB::table('employees')->exists()) {
            return;
        }

        $employees = [
            [['Samer Khalife', 'Samer khalifeh'], 'Samer Khalife', '2020-12-01', 'admin'],
            [['Ramzi Zaarour'], 'Ramzi Zaarour', '2024-01-02', 'admin'],
            [['Mohamad Jarad'], 'Mohamad Jarad', '2020-12-07', 'foreman'],
            [['RASHED Al Doghem', 'Rashed Aldoghem'], 'RASHED Al Doghem', '2024-01-13', 'foreman'],
            [['Ahmad Yassin'], 'Ahmad Yassin', '2020-12-01', 'foreman'],
            [['Mahmoud Yassin'], 'Mahmoud Yassin', '2020-09-01', 'foreman'],
            [['Ramzi Slim'], 'Ramzi Slim', '2023-05-01', 'foreman'],
            [['Ali Alzaher'], 'Ali Alzaher', '2023-05-09', 'foreman'],
            [['Ayid Allahima'], 'Ayid Allahima', '2023-08-05', 'foreman'],
            [['Mohamad Al Sayed'], 'Mohamad Al Sayed', '2023-11-01', 'foreman'],
            [['Abdallah Moussaa', 'Abdallah Moussa'], 'Abdallah Moussaa', '2022-10-01', 'garage'],
            [['Ghassan Abu Akl'], 'Ghassan Abu Akl', '2023-10-31', 'garage'],
            [['Khalil Bourgi'], 'Khalil Bourgi', '2024-03-01', 'garage'],
            [['Marwa Jamal'], 'Marwa Jamal', '2023-05-01', 'civil_engineer'],
            [['Jamal Mikkawi'], 'Jamal Mikkawi', '2023-06-01', 'civil_engineer'],
            [['Hassan Mahdi'], 'Hassan Mahdi', '2020-09-01', 'civil_engineer'],
            [['Sami Massoudi'], 'Sami Massoudi', '2024-01-15', 'civil_engineer'],
            [['Zein DAWI', 'Zein Dawi'], 'Zein DAWI', '2024-01-20', 'civil_engineer'],
            [['Ghazi Laouini'], 'Ghazi Laouini', '2023-11-06', 'topographer'],
            [['Mahmoud Hassan'], 'Mahmoud Hassan', '2022-11-02', 'topographer'],
            [['Hani Al Dahesh'], 'Hani Al Dahesh', null, 'foreman'],
            [['Mahdi Jaffal'], 'Mahdi Jaffal', null, 'civil_engineer'],
            [['Iyad Mroueh', 'Iyad Mroue'], 'Iyad Mroueh', '2026-03-01', 'civil_engineer'],
            [['Zahraa Kefel'], 'Zahraa Kefel', '2026-06-01', 'architect'],
            [['Wael Zorkot'], 'Wael Zorkot', '2026-06-22', 'civil_engineer'],
            [['Hassan Baydoun'], 'Hassan Baydoun', null, 'asphalt_plant'],
            [['Mahmoud Mahfoud'], 'Mahmoud Mahfoud', null, 'topographer'],
            [['Youssef Yassine', 'Youssef Yassin'], 'Youssef Yassine', '2026-09-09', 'it'],
        ];

        DB::transaction(function () use ($employees): void {
            foreach ($employees as [$aliases, $canonicalName, $employmentDate, $jobTitle]) {
                $employee = DB::table('employees')
                    ->whereIn('name', $aliases)
                    ->orderByDesc('is_active')
                    ->orderByDesc('id')
                    ->first();

                if ($employee) {
                    DB::table('employees')->where('id', $employee->id)->update([
                        'employment_date' => $employmentDate,
                        'job_title' => $jobTitle,
                        'updated_at' => now(),
                    ]);

                    continue;
                }

                DB::table('employees')->insert([
                    'name' => $canonicalName,
                    'employment_date' => $employmentDate,
                    'job_title' => $jobTitle,
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        });
    }

    public function down(): void
    {
        // Personnel data imported from an authoritative company list is not removed on rollback.
    }
};

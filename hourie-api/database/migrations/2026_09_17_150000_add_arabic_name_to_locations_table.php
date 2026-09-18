<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('locations', function (Blueprint $table) {
            $table->string('name_ar')->nullable()->after('name');
        });

        $translations = [
            'BASSAM' => 'بسام',
            'VRIDI' => 'فريدي',
            'BENGERVILLE' => 'بينجرفيل',
            'BASE' => 'القاعدة',
            'CENTRALE' => 'المحطة المركزية',
        ];

        foreach ($translations as $name => $nameAr) {
            DB::table('locations')->where('name', $name)->update(['name_ar' => $nameAr]);
        }
    }

    public function down(): void
    {
        Schema::table('locations', function (Blueprint $table) {
            $table->dropColumn('name_ar');
        });
    }
};

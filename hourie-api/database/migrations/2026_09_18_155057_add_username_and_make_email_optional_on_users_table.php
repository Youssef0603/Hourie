<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('username', 50)->nullable()->after('name');
            $table->string('email')->nullable()->change();
        });

        $usedUsernames = [];

        DB::table('users')->orderBy('id')->get(['id', 'email', 'name'])->each(function (object $user) use (&$usedUsernames): void {
            $source = Str::before((string) $user->email, '@') ?: (string) $user->name;
            $base = Str::of($source)->ascii()->lower()->replaceMatches('/[^a-z0-9._-]+/', '.')->trim('.-_')->limit(40, '')->toString();
            $base = $base !== '' ? $base : 'user'.$user->id;
            $username = $base;
            $suffix = 2;

            while (isset($usedUsernames[$username])) {
                $username = $base.$suffix;
                $suffix++;
            }

            DB::table('users')->where('id', $user->id)->update(['username' => $username]);
            $usedUsernames[$username] = true;
        });

        Schema::table('users', function (Blueprint $table) {
            $table->unique('username');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('users')->whereNull('email')->orderBy('id')->get(['id'])->each(function (object $user): void {
            DB::table('users')->where('id', $user->id)->update(['email' => 'user'.$user->id.'@invalid.local']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['username']);
            $table->dropColumn('username');
            $table->string('email')->nullable(false)->change();
        });
    }
};

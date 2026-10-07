<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('equipment:send-inspection-reminders')
    ->dailyAt('08:00')
    ->withoutOverlapping(30)
    ->onOneServer();
Schedule::command('insurance:send-expiry-reminders')
    ->dailyAt('08:05')
    ->withoutOverlapping(30)
    ->onOneServer();
Schedule::command('bonds:send-expiry-reminders')
    ->dailyAt('08:10')
    ->withoutOverlapping(30)
    ->onOneServer();
Schedule::command('temporary-admissions:send-expiry-reminders')
    ->dailyAt('08:15')
    ->withoutOverlapping(30)
    ->onOneServer();

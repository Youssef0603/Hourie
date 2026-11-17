<?php

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;

it('passes after the scheduler and queue worker record fresh heartbeats', function () {
    Storage::fake('equipment-images');
    Storage::fake('equipment-documents');
    config()->set('mail.default', 'array');

    $this->artisan('hourie:heartbeat')->assertSuccessful();

    $this->artisan('hourie:health-check')
        ->expectsOutputToContain('connected')
        ->expectsOutputToContain('equipment-images is writable')
        ->expectsOutputToContain('equipment-documents is writable')
        ->expectsOutputToContain('array configuration is present')
        ->assertSuccessful();
});

it('fails when the scheduler and queue heartbeats are stale', function () {
    Storage::fake('equipment-images');
    Storage::fake('equipment-documents');
    config()->set('mail.default', 'array');
    Cache::put(config('hourie-health.scheduler_heartbeat_key'), now()->subMinutes(10)->timestamp);
    Cache::put(config('hourie-health.queue_heartbeat_key'), now()->subMinutes(10)->timestamp);

    $this->artisan('hourie:health-check')
        ->expectsOutputToContain('FAILED')
        ->assertFailed();
});

it('sends an optional live email health check', function () {
    Storage::fake('equipment-images');
    Storage::fake('equipment-documents');
    config()->set('mail.default', 'array');
    $this->artisan('hourie:heartbeat')->assertSuccessful();

    $this->artisan('hourie:health-check', ['--email' => 'operator@hourie.com'])
        ->expectsOutputToContain('test email accepted for operator@hourie.com')
        ->assertSuccessful();
});

<?php

namespace App\Console\Commands;

use App\Jobs\RecordQueueHeartbeat;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;

#[Signature('hourie:heartbeat')]
#[Description('Record scheduler activity and dispatch a queue-worker heartbeat')]
class RecordProductionHeartbeat extends Command
{
    public function handle(): int
    {
        Cache::put(
            (string) config('hourie-health.scheduler_heartbeat_key'),
            now()->timestamp,
            now()->addMinutes(10),
        );
        RecordQueueHeartbeat::dispatch();

        $this->info('Production heartbeat recorded.');

        return self::SUCCESS;
    }
}

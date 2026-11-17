<?php

namespace App\Console\Commands;

use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;

#[Signature('hourie:health-check {--email= : Send a live test email to this address}')]
#[Description('Check the production database, storage, scheduler, queue, and email configuration')]
class CheckProductionHealth extends Command
{
    /** @var array<string, array{status: string, detail: string}> */
    private array $results = [];

    public function handle(): int
    {
        $this->check('database', function (): string {
            DB::connection()->getPdo();
            DB::select('SELECT 1');

            return 'connected';
        });
        $this->checkStorage('equipment images', (string) config('filesystems.equipment_images_disk'));
        $this->checkStorage('equipment documents', (string) config('filesystems.equipment_documents_disk'));
        $this->checkHeartbeat('scheduler', (string) config('hourie-health.scheduler_heartbeat_key'));
        $this->checkHeartbeat('queue worker', (string) config('hourie-health.queue_heartbeat_key'));
        $this->check('email', fn (): string => $this->checkEmail());

        $this->table(
            ['Component', 'Status', 'Detail'],
            collect($this->results)->map(
                fn (array $result, string $component): array => [$component, $result['status'], $result['detail']],
            )->values()->all(),
        );

        return collect($this->results)->contains('status', 'FAILED')
            ? self::FAILURE
            : self::SUCCESS;
    }

    private function checkStorage(string $name, string $disk): void
    {
        $this->check($name, function () use ($disk): string {
            $probePath = '.health-check/'.Str::uuid().'.txt';

            try {
                if (! Storage::disk($disk)->put($probePath, 'hourie-storage-health-check')) {
                    throw new \RuntimeException('write failed');
                }
                if (Storage::disk($disk)->get($probePath) !== 'hourie-storage-health-check') {
                    throw new \RuntimeException('read verification failed');
                }
            } finally {
                Storage::disk($disk)->delete($probePath);
            }

            return $disk.' is writable';
        });
    }

    private function checkHeartbeat(string $name, string $cacheKey): void
    {
        $this->check($name, function () use ($cacheKey): string {
            $timestamp = Cache::get($cacheKey);
            if (! is_int($timestamp) && ! ctype_digit((string) $timestamp)) {
                throw new \RuntimeException('heartbeat has not been recorded');
            }

            $age = now()->timestamp - (int) $timestamp;
            if ($age < 0 || $age > (int) config('hourie-health.max_heartbeat_age_seconds')) {
                throw new \RuntimeException('heartbeat is '.$age.' seconds old');
            }

            return 'heartbeat '.$age.' seconds ago';
        });
    }

    private function checkEmail(): string
    {
        $mailer = (string) config('mail.default');
        if ($mailer === 'microsoft-graph') {
            foreach (['tenant_id', 'client_id', 'client_secret', 'sender'] as $key) {
                if (blank(config('mail.mailers.microsoft-graph.'.$key))) {
                    throw new \RuntimeException('missing Microsoft Graph setting: '.$key);
                }
            }
        }

        $recipient = trim((string) $this->option('email'));
        if ($recipient === '') {
            return $mailer.' configuration is present';
        }
        if (filter_var($recipient, FILTER_VALIDATE_EMAIL) === false) {
            throw new \RuntimeException('test recipient is not a valid email address');
        }

        Mail::raw(
            'This message confirms that Hourie production email delivery is working.',
            fn ($message) => $message->to($recipient)->subject('Hourie production email health check'),
        );

        return 'test email accepted for '.$recipient;
    }

    private function check(string $component, callable $check): void
    {
        try {
            $this->results[$component] = ['status' => 'OK', 'detail' => (string) $check()];
        } catch (Throwable $exception) {
            $this->results[$component] = ['status' => 'FAILED', 'detail' => $exception->getMessage()];
        }
    }
}

<?php

namespace App\Providers;

use App\Mail\Transport\MicrosoftGraphTransport;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Client\Factory as HttpFactory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Mail::extend('microsoft-graph', function (array $config): MicrosoftGraphTransport {
            return new MicrosoftGraphTransport(
                http: $this->app->make(HttpFactory::class),
                tenantId: (string) ($config['tenant_id'] ?? ''),
                clientId: (string) ($config['client_id'] ?? ''),
                clientSecret: (string) ($config['client_secret'] ?? ''),
                sender: (string) ($config['sender'] ?? config('mail.from.address')),
                loginBaseUrl: rtrim((string) ($config['login_base_url'] ?? 'https://login.microsoftonline.com'), '/'),
                graphBaseUrl: rtrim((string) ($config['graph_base_url'] ?? 'https://graph.microsoft.com/v1.0'), '/'),
                connectTimeout: (int) ($config['connect_timeout'] ?? 5),
                timeout: (int) ($config['timeout'] ?? 30),
            );
        });

        RateLimiter::for('login', function (Request $request): Limit {
            $login = $request->string('login')->toString() ?: $request->string('email')->toString();
            $login = Str::transliterate(Str::lower($login));

            return Limit::perMinute(5)->by($login.'|'.$request->ip());
        });
    }
}

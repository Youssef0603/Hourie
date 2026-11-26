<?php

namespace App\Providers;

use App\Mail\Transport\MicrosoftGraphTransport;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Client\Factory as HttpFactory;
use Illuminate\Http\Middleware\TrustProxies;
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
        $trustedProxies = trim((string) config('app.trusted_proxies'));
        if ($trustedProxies !== '') {
            TrustProxies::at($trustedProxies === '*' ? '*' : array_map('trim', explode(',', $trustedProxies)));
        }

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

        // Two limits on login attempts: per username whatever the address (a
        // faked forwarding header cannot reset it), and per address across all
        // usernames (one source cannot try many accounts).
        RateLimiter::for('login', function (Request $request): array {
            $login = $request->string('login')->toString() ?: $request->string('email')->toString();
            $login = Str::transliterate(Str::lower($login));

            return [
                Limit::perMinute(5)->by('login:'.$login),
                Limit::perMinute(20)->by('ip:'.$request->ip()),
            ];
        });
    }
}

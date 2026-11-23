<?php

use App\Providers\AppServiceProvider;
use Illuminate\Http\Middleware\TrustProxies;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

afterEach(function (): void {
    TrustProxies::flushState();
});

function registerClientEchoRoute(): void
{
    Route::get('/api/_test/client', fn (Request $request) => [
        'ip' => $request->ip(),
        'secure' => $request->isSecure(),
    ]);
}

it('reads the client address and scheme from a configured gateway', function () {
    config()->set('app.trusted_proxies', '10.0.0.5, 10.0.0.6');
    (new AppServiceProvider(app()))->boot();
    registerClientEchoRoute();

    $this->withServerVariables(['REMOTE_ADDR' => '10.0.0.5'])
        ->withHeaders(['X-Forwarded-For' => '196.47.10.20', 'X-Forwarded-Proto' => 'https'])
        ->getJson('/api/_test/client')
        ->assertExactJson(['ip' => '196.47.10.20', 'secure' => true]);
});

it('ignores forwarded headers when no gateway is configured', function () {
    config()->set('app.trusted_proxies', null);
    (new AppServiceProvider(app()))->boot();
    registerClientEchoRoute();

    $this->withServerVariables(['REMOTE_ADDR' => '10.0.0.5'])
        ->withHeaders(['X-Forwarded-For' => '196.47.10.20', 'X-Forwarded-Proto' => 'https'])
        ->getJson('/api/_test/client')
        ->assertExactJson(['ip' => '10.0.0.5', 'secure' => false]);
});

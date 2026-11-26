<?php

use App\Http\Middleware\SetLocale;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Outside local and tests, answer only requests addressed to APP_URL's
        // host (assets.hourie.com and its subdomains): a forged Host or
        // X-Forwarded-Host header cannot make Hourie build links or redirects
        // to another site.
        $middleware->trustHosts();
        $middleware->redirectGuestsTo(null);
        $middleware->statefulApi();
        $middleware->append(SetLocale::class);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();

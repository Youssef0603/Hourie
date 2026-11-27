<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Answers 404 for the routes of a module switched off in config/hourie-features.php. */
class EnsureFeatureIsEnabled
{
    /**
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next, string $feature): Response
    {
        abort_unless((bool) config("hourie-features.{$feature}"), 404);

        return $next($request);
    }
}

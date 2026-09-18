<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Symfony\Component\HttpFoundation\Response;

class SetLocale
{
    public function handle(Request $request, Closure $next): Response
    {
        $language = strtolower((string) $request->header('Accept-Language', 'fr'));
        App::setLocale(str_starts_with($language, 'ar') ? 'ar' : 'fr');

        return $next($request);
    }
}

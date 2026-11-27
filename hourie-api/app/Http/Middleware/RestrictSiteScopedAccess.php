<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * A Chef de chantier only works with the equipment of his site. Everything
 * else (orders, insurance, bonds, people, settings, dashboard…) is closed to
 * him by default, so a new module never opens to him by accident.
 */
class RestrictSiteScopedAccess
{
    /** Paths a site-scoped account may call; the equipment policy then limits them to his site. */
    private const ALLOWED_PATHS = [
        'api/v1/equipment',
        'api/v1/equipment/*',
        'api/v1/equipment-filter-options',
        'api/v1/maintenance-warnings',
    ];

    /**
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->user()?->role->isSiteScoped()) {
            return $next($request);
        }

        $readsCatalogs = $request->isMethod('GET') && $request->is('api/v1/catalog-options');
        abort_unless($readsCatalogs || $request->is(...self::ALLOWED_PATHS), 403);

        return $next($request);
    }
}

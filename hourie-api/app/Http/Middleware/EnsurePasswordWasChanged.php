<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePasswordWasChanged
{
    /**
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user()?->must_change_password === true) {
            return response()->json([
                'message' => __('auth.password_change_required'),
                'code' => 'password_change_required',
            ], 403);
        }

        return $next($request);
    }
}

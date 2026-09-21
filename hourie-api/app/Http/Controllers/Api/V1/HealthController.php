<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Throwable;

final class HealthController extends Controller
{
    public function __invoke(): JsonResponse
    {
        try {
            DB::select('SELECT 1');
        } catch (Throwable $exception) {
            report($exception);

            return response()->json([
                'status' => 'unavailable',
            ], 503);
        }

        return response()->json([
            'status' => 'ok',
        ]);
    }
}

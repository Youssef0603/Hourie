<?php

namespace App\Http\Controllers\Api\V1;

use App\Actions\Dashboard\BuildExecutiveDashboard;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    public function __invoke(BuildExecutiveDashboard $dashboard): JsonResponse
    {
        return response()->json(['data' => $dashboard->handle()]);
    }
}

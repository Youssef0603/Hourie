<?php

namespace App\Http\Controllers\Api\V1\Equipment;

use App\Actions\Equipment\ListMaintenanceWarnings;
use App\Http\Controllers\Controller;
use App\Http\Resources\Equipment\MaintenanceWarningResource;
use App\Models\Equipment;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class MaintenanceWarningController extends Controller
{
    public function __invoke(ListMaintenanceWarnings $listMaintenanceWarnings): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', Equipment::class);

        $result = $listMaintenanceWarnings->handle();

        return MaintenanceWarningResource::collection($result['warnings'])
            ->additional(['summary' => $result['summary']]);
    }
}

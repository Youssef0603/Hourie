<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\TollBadges\SaveTollBadgeRequest;
use App\Http\Resources\TollBadgeResource;
use App\Models\Equipment;
use App\Models\TollBadge;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

/**
 * Toll badges of a car or truck: the subscription and phone number each
 * badge is registered under, and its last known balance.
 */
class TollBadgeController extends Controller
{
    public function index(Request $request, Equipment $equipment): AnonymousResourceCollection
    {
        abort_unless($request->user()?->can('view', $equipment), 403);

        return TollBadgeResource::collection(
            $equipment->tollBadges()->orderBy('operator')->orderBy('badge_number')->get(),
        );
    }

    public function store(SaveTollBadgeRequest $request, Equipment $equipment): TollBadgeResource
    {
        $badge = $equipment->tollBadges()->create([
            ...$request->validated(),
            'created_by_user_id' => $request->user()->id,
        ]);

        return new TollBadgeResource($badge);
    }

    public function update(SaveTollBadgeRequest $request, Equipment $equipment, TollBadge $tollBadge): TollBadgeResource
    {
        abort_unless($tollBadge->equipment_id === $equipment->id, 404);
        $tollBadge->update($request->validated());

        return new TollBadgeResource($tollBadge);
    }

    public function destroy(Request $request, Equipment $equipment, TollBadge $tollBadge): Response
    {
        abort_unless($request->user()?->can('update', $equipment), 403);
        abort_unless($tollBadge->equipment_id === $equipment->id, 404);
        $tollBadge->delete();

        return response()->noContent();
    }
}

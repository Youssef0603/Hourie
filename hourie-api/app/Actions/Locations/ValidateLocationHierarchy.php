<?php

namespace App\Actions\Locations;

use App\Models\Location;
use Illuminate\Validation\ValidationException;

class ValidateLocationHierarchy
{
    public function handle(?Location $location, ?Location $parent, ?int $projectId): void
    {
        if ($parent === null) {
            return;
        }

        if ($parent->project_id !== $projectId) {
            throw ValidationException::withMessages([
                'parent_id' => [__('validation.location_project_mismatch')],
            ]);
        }

        if ($location === null) {
            return;
        }

        $ancestor = $parent;

        while ($ancestor !== null) {
            if ($ancestor->is($location)) {
                throw ValidationException::withMessages([
                    'parent_id' => [__('validation.location_cycle')],
                ]);
            }

            $ancestor = $ancestor->parent()->first();
        }
    }
}

<?php

use App\Actions\Locations\ValidateLocationHierarchy;
use App\Models\Location;
use App\Models\Project;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Validation\ValidationException;

uses(LazilyRefreshDatabase::class);

it('accepts a parent location from the same project', function () {
    $project = Project::factory()->create();
    $parent = Location::factory()->for($project)->create();

    expect(fn () => app(ValidateLocationHierarchy::class)->handle(null, $parent, $project->id))
        ->not->toThrow(ValidationException::class);
});

it('rejects a parent location from another project', function () {
    $project = Project::factory()->create();
    $otherProject = Project::factory()->create();
    $parent = Location::factory()->for($otherProject)->create();

    expect(fn () => app(ValidateLocationHierarchy::class)->handle(null, $parent, $project->id))
        ->toThrow(ValidationException::class, 'La localisation parente doit appartenir au même projet.');
});

it('rejects circular location ancestry', function () {
    $project = Project::factory()->create();
    $root = Location::factory()->for($project)->create(['name' => 'BASSAM']);
    $child = Location::factory()->for($project)->for($root, 'parent')->create(['name' => 'BASE']);
    $grandchild = Location::factory()->for($project)->for($child, 'parent')->create(['name' => 'ZONE A']);

    expect(fn () => app(ValidateLocationHierarchy::class)->handle($root, $grandchild, $project->id))
        ->toThrow(ValidationException::class, 'Une localisation ne peut pas être placée sous elle-même ou sous l’un de ses descendants.');
});

<?php

use Illuminate\Support\Facades\DB;

it('reports that the api and database are available', function () {
    $this->getJson('/api/health')
        ->assertOk()
        ->assertExactJson([
            'status' => 'ok',
        ]);
});

it('reports service unavailable without leaking database errors', function () {
    DB::shouldReceive('select')
        ->once()
        ->with('SELECT 1')
        ->andThrow(new RuntimeException('secret database connection details'));

    $this->getJson('/api/health')
        ->assertServiceUnavailable()
        ->assertExactJson([
            'status' => 'unavailable',
        ])
        ->assertDontSee('secret database connection details');
});

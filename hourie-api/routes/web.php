<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return file_exists(public_path('index.html'))
        ? response()->file(public_path('index.html'))
        : view('welcome');
});

Route::get('/{path}', function () {
    abort_unless(file_exists(public_path('index.html')), 404);

    return response()->file(public_path('index.html'));
})->where('path', '^(?!api(?:/|$)|sanctum(?:/|$)|up$).*$');

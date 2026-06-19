<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\NarudzbenicaController;
use App\Http\Controllers\Api\ReferenceController;

/*
|--------------------------------------------------------------------------
| JSON API for the Angular SPA
|--------------------------------------------------------------------------
| Additive, token-based (Sanctum) API consumed by the Angular frontend.
| It reuses the existing Eloquent models and services and does NOT alter
| the existing session/Blade web application in any way.
*/

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

// Public auth endpoint.
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // Purchase orders (narudžbenice) — pharmacy admin (A) and central admin (C).
    Route::middleware('role:A,C')->group(function () {
        Route::get('/narudzbenice', [NarudzbenicaController::class, 'index']);
        Route::post('/narudzbenice', [NarudzbenicaController::class, 'store']);
        Route::get('/narudzbenice/{narudzbenica}', [NarudzbenicaController::class, 'show']);
        Route::post('/narudzbenice/{narudzbenica}/posalji', [NarudzbenicaController::class, 'send']);
        Route::post('/narudzbenice/{narudzbenica}/isporuceno', [NarudzbenicaController::class, 'markDelivered']);
        Route::post('/narudzbenice/{narudzbenica}/otkazi', [NarudzbenicaController::class, 'cancel']);

        // Reference data for the order form.
        Route::get('/dobavljaci', [ReferenceController::class, 'dobavljaci']);
        Route::get('/dobavljaci/{dobavljac}/lekovi', [ReferenceController::class, 'dobavljacLekovi']);
        Route::get('/apoteke', [ReferenceController::class, 'apoteke']);
    });
});

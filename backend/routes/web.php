<?php

use App\Http\Controllers\AccountDeleteReauthCallbackController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});
Route::get('/auth/oauth/google/delete-reauth/callback', [AccountDeleteReauthCallbackController::class, 'google'])
    ->middleware('throttle:20,1')
    ->name('delete-reauth.google.callback');
Route::get('/auth/oauth/github/delete-reauth/callback', [AccountDeleteReauthCallbackController::class, 'github'])
    ->middleware('throttle:20,1')
    ->name('delete-reauth.github.callback');

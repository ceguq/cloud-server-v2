<?php

use App\Http\Controllers\AccountDeleteReauthCallbackController;
use App\Http\Controllers\GitHubOAuthController;
use App\Http\Controllers\GoogleOAuthController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});
Route::get('/auth/oauth/google', [GoogleOAuthController::class, 'redirect'])
    ->middleware('throttle:20,1');
Route::get('/auth/oauth/google/callback', [GoogleOAuthController::class, 'callback'])
    ->middleware('throttle:20,1');
Route::get('/auth/oauth/github', [GitHubOAuthController::class, 'redirect'])
    ->middleware('throttle:20,1');
Route::get('/auth/oauth/github/callback', [GitHubOAuthController::class, 'callback'])
    ->middleware('throttle:20,1');

Route::get('/auth/oauth/google/delete-reauth/callback', [AccountDeleteReauthCallbackController::class, 'google'])
    ->middleware('throttle:20,1')
    ->name('delete-reauth.google.callback');
Route::get('/auth/oauth/github/delete-reauth/callback', [AccountDeleteReauthCallbackController::class, 'github'])
    ->middleware('throttle:20,1')
    ->name('delete-reauth.github.callback');

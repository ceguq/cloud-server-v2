<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\FileController;
use App\Http\Controllers\FolderController;
use App\Http\Controllers\ShareController;
use App\Http\Controllers\StorageController;
use App\Http\Controllers\TrashController;
use App\Http\Controllers\ActivityLogController;


use Illuminate\Support\Facades\Route;


Route::get('/ping', function () {
    return response()->json([
        'message' => 'NimbusDrive V2 API is running',
    ]);
});

Route::post('/auth/login', [AuthController::class, 'login']);

// Public share link endpoints (NOT using auth:sanctum)
Route::get('/share/{token}', [ShareController::class, 'show']);
Route::get('/share/{token}/download', [ShareController::class, 'download']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    Route::get('/activity-logs', [ActivityLogController::class, 'index']);

    Route::get('/folders', [FolderController::class, 'index']);

    Route::post('/folders', [FolderController::class, 'store']);
    Route::patch('/folders/{folder}', [FolderController::class, 'update']);
    Route::delete('/folders/{folder}', [FolderController::class, 'destroy']);

    Route::get('/files', [FileController::class, 'index']);
    Route::post('/files/upload', [FileController::class, 'upload']);
    Route::get('/files/recent', [FileController::class, 'recent']);

    Route::get('/files/{file}/download', [FileController::class, 'download']);
    Route::patch('/files/{file}', [FileController::class, 'update']);
    Route::delete('/files/{file}', [FileController::class, 'destroy']);
    Route::post('/files/{file}/cancel-upload', [FileController::class, 'cancelUpload']);

    // Authenticated share link endpoints
    Route::get('/share-links', [ShareController::class, 'index']);
    Route::post('/files/{file}/share', [ShareController::class, 'create']);
    Route::delete('/share-links/{shareLink}', [ShareController::class, 'destroy']);

    Route::get('/storage', [StorageController::class, 'info']);

    // Trash endpoints (soft deleted files)
    Route::get('/trash/files', [TrashController::class, 'files']);
    Route::post('/trash/files/{id}/restore', [TrashController::class, 'restoreFile']);
    Route::delete('/trash/files/{id}/force', [TrashController::class, 'forceDeleteFile']);

    // Trash endpoints (soft deleted folders)
    Route::get('/trash/folders', [TrashController::class, 'folders']);
    Route::post('/trash/folders/{id}/restore', [TrashController::class, 'restoreFolder']);
    Route::delete('/trash/folders/{id}/force', [TrashController::class, 'forceDeleteFolder']);
});








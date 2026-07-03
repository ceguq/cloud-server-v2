<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\FileController;
use App\Http\Controllers\FolderController;
use App\Http\Controllers\ShareController;
use App\Http\Controllers\StorageController;
use App\Http\Controllers\TrashController;
use App\Http\Controllers\ActivityLogController;
use App\Http\Controllers\Admin\UserController as AdminUserController;
use App\Http\Controllers\ServerMonitorController;
use App\Http\Controllers\DeviceController;
use App\Http\Controllers\GDriveController;



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

    Route::middleware('admin')->get('/admin/users', [AdminUserController::class, 'index']);



    Route::get('/activity-logs', [ActivityLogController::class, 'index']);

    Route::middleware('admin')->get('/admin/activity-logs', [ActivityLogController::class, 'adminIndex']);


    Route::get('/folders', [FolderController::class, 'index']);

    Route::post('/folders', [FolderController::class, 'store']);
    Route::patch('/folders/{folder}', [FolderController::class, 'update']);
    Route::delete('/folders/{folder}', [FolderController::class, 'destroy']);

    // Move folder
    Route::patch('/folders/{folder}/move', [FolderController::class, 'move']);

    // Duplicate finder (local My Files) - read-only
    // Must be defined before dynamic route /files/{file}
    Route::get('/files/duplicates', [FileController::class, 'duplicates']);

    // Move file
    Route::patch('/files/{file}/move', [FileController::class, 'move']);

    Route::get('/files', [FileController::class, 'index']);


    Route::post('/files/upload', [FileController::class, 'upload']);

    Route::get('/files/recent', [FileController::class, 'recent']);

    Route::get('/files/{file}/preview', [FileController::class, 'preview']);
    Route::get('/files/{file}/download', [FileController::class, 'download']);
    Route::patch('/files/{file}', [FileController::class, 'update']);

    Route::delete('/files/{file}', [FileController::class, 'destroy']);
    Route::post('/files/{file}/cancel-upload', [FileController::class, 'cancelUpload']);

    // Authenticated share link endpoints
    Route::get('/share-links', [ShareController::class, 'index']);
    Route::post('/files/{file}/share', [ShareController::class, 'create']);
    Route::delete('/share-links/{shareLink}', [ShareController::class, 'destroy']);

    Route::get('/storage', [StorageController::class, 'info']);
    Route::get('/storage/breakdown', [StorageController::class, 'breakdown']);

    // Server Monitor (read-only)

    Route::get('/server-monitor', [ServerMonitorController::class, 'index']);

    // Devices (read-only)
    Route::get('/devices', [DeviceController::class, 'index']);


    // Trash endpoints (soft deleted files)
    Route::get('/trash/files', [TrashController::class, 'files']);
    Route::post('/trash/files/{id}/restore', [TrashController::class, 'restoreFile']);
    Route::delete('/trash/files/{id}/force', [TrashController::class, 'forceDeleteFile']);

    // Trash endpoints (soft deleted folders)
    Route::get('/trash/folders', [TrashController::class, 'folders']);
    Route::post('/trash/folders/{id}/restore', [TrashController::class, 'restoreFolder']);
    Route::delete('/trash/folders/{id}/force', [TrashController::class, 'forceDeleteFolder']);

    // Google Drive connector (read-only MVP skeleton)
    Route::get('/gdrive/accounts', [GDriveController::class, 'index']);
    Route::get('/gdrive/files', [GDriveController::class, 'allFiles']);
    Route::get('/gdrive/accounts/{account}/files', [GDriveController::class, 'files']);
    Route::get('/gdrive/connect', [GDriveController::class, 'connect']);
    Route::delete('/gdrive/accounts/{account}', [GDriveController::class, 'destroy']);

    // Google Drive file download proxy (read-only)
    Route::get('/gdrive/accounts/{account}/files/{fileId}/download', [GDriveController::class, 'downloadFile']);

    // Google Drive trash management
    Route::get('/gdrive/accounts/{account}/trash', [GDriveController::class, 'trashedFiles']);
    Route::post('/gdrive/accounts/{account}/files/{fileId}/trash', [GDriveController::class, 'trash']);
    Route::post('/gdrive/accounts/{account}/files/{fileId}/restore', [GDriveController::class, 'restore']);
    Route::post('/gdrive/accounts/{account}/files/{fileId}/visibility', [GDriveController::class, 'updateVisibility']);
    Route::patch('/gdrive/accounts/{account}/files/{fileId}/rename', [GDriveController::class, 'rename']);
    Route::delete('/gdrive/accounts/{account}/files/{fileId}/permanent', [GDriveController::class, 'permanentDelete']);
    Route::post('/gdrive/accounts/{account}/folders', [GDriveController::class, 'createFolder']);

    // Google Drive file upload (MVP)
    Route::post('/gdrive/accounts/{account}/files/upload', [GDriveController::class, 'uploadFile']);



});

Route::get('/gdrive/callback', [GDriveController::class, 'callback']);












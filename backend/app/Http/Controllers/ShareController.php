<?php

namespace App\Http\Controllers;

use App\Models\File;

use App\Models\ShareLink;
use App\Services\ActivityLogService;

use Illuminate\Http\JsonResponse;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ShareController extends Controller
{
    public function index(Request $request): JsonResponse
    {

        $user = $request->user();

        $shareLinks = ShareLink::query()
            ->whereHas('file', fn ($q) => $q->where('user_id', $user->id))
            ->with('file')
            ->latest()
            ->get();

        return response()->json([
            'data' => $shareLinks,
        ]);
    }

    public function create(
        Request $request,
        File $file,
        ActivityLogService $activityLogService
    ): JsonResponse
    {

        $user = $request->user();



        if ($file->user_id !== $user->id) {
            return response()->json([
                'message' => 'File tidak ditemukan',
            ], 403);
        }

        $validated = $request->validate([
            'expires_at' => ['nullable', 'date', 'after:now'],
            'password' => ['nullable', 'string', 'max:255'],
        ]);

        $rawPassword = $validated['password'] ?? null;
        $passwordHash = null;
        if (is_string($rawPassword) && trim($rawPassword) !== '') {
            $passwordHash = Hash::make($rawPassword);
        }

        $token = Str::random(40);

        $shareLink = ShareLink::create([
            'file_id' => $file->id,
            'token' => $token,
            'expires_at' => $validated['expires_at'] ?? null,
            'password' => $passwordHash,
            'download_count' => 0,
        ]);

        // Activity Log: share.create (only after ShareLink created)
        $shareLinkId = (string) $shareLink->id;
        $fileId = (string) $file->id;
        $originalName = $file->original_name;
        $expiresAt = $shareLink->expires_at ? $shareLink->expires_at->toISOString() : null;
        $isProtected = !empty($passwordHash);

        $activityLogService->log(
            action: 'share.create',
            description: 'Share link dibuat untuk file: ' . $originalName,
            subject: $shareLink,
            metadata: [
                'share_link_id' => $shareLinkId,
                'file_id' => $fileId,
                'original_name' => $originalName,
                'expires_at' => $expiresAt,
                'is_protected' => $isProtected,
            ],
            user: $user,
            request: $request
        );

        return response()->json([
            'message' => 'Share link berhasil dibuat',
            'data' => [
                'id' => (string) $shareLink->id,
                'token' => $shareLink->token,
                'download_count' => (int) $shareLink->download_count,
                'expires_at' => $shareLink->expires_at?->toISOString(),
                'requires_password' => $isProtected,
            ],
        ], 201);
    }

    public function destroy(Request $request, ShareLink $shareLink, ActivityLogService $activityLogService): JsonResponse
    {
        $user = $request->user();

        // Activity Log: share.delete requires safe metadata before deletion
        $shareLinkId = (string) $shareLink->id;
        $fileId = $shareLink->relationLoaded('file') && $shareLink->file ? (string) $shareLink->file->id : null;
        $originalName = $shareLink->relationLoaded('file') && $shareLink->file ? $shareLink->file->original_name : null;
        $expiresAt = $shareLink->expires_at ? $shareLink->expires_at->toISOString() : null;
        $isProtected = !empty($shareLink->password);

        $shareLink->load('file');

        if (!$shareLink->file || $shareLink->file->user_id !== $user->id) {
            return response()->json([
                'message' => 'Share link tidak ditemukan',
            ], 403);
        }

        $shareLink->delete();

        // Activity Log: share.delete (after delete succeeds)
        $activityLogService->log(
            action: 'share.delete',
            description: 'Share link dihapus untuk file: ' . (string) $originalName,
            subject: $shareLink,
            metadata: [
                'share_link_id' => $shareLinkId,
                'file_id' => $fileId,
                'original_name' => $originalName,
                'expires_at' => $expiresAt,
                'is_protected' => $isProtected,
            ],
            user: $user,
            request: $request
        );

        return response()->json([
            'message' => 'Share link berhasil dihapus',
        ]);

    }

    public function show(string $token, Request $request): JsonResponse
    {
        $shareLink = ShareLink::with('file')->where('token', $token)->first();

        if (!$shareLink) {
            return response()->json([
                'message' => 'Share link tidak ditemukan',
            ], 404)->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
        }

        if ($shareLink->expires_at && $shareLink->expires_at->isPast()) {
            return response()->json([
                'message' => 'Share link sudah kedaluwarsa',
            ], 410)->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
        }

        $file = $shareLink->file;

        // Jika file sudah soft-deleted, relasi biasanya null (karena default model exclude soft deleted).
        // Pastikan akses publik untuk file yang di-trash ditolak.
        if (!$file) {
            return response()->json([
                'message' => 'File tidak ditemukan.',
            ], 404)->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
        }

        // Pastikan folder yang dibaca termasuk soft-deleted saat diperlukan.
        // Jika folder file sudah soft-deleted, jangan izinkan share publik.
        $file->load(['folder' => function ($q) {
            $q->withTrashed();
        }]);

        if ($file->folder?->trashed()) {
            return response()->json([
                'message' => 'File tidak ditemukan.',
            ], 404)->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
        }

        $providedPassword = is_string($request->input('password')) ? trim($request->input('password')) : '';
        $requiresPassword = !empty($shareLink->password);

        if ($requiresPassword) {
            if ($providedPassword === '' || !Hash::check($providedPassword, $shareLink->password)) {
                return response()->json([
                    'message' => 'Password diperlukan untuk mengakses tautan ini.',
                    'requires_password' => true,
                ], 403)->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
            }
        }

        return response()->json([
            'data' => [
                'id' => (string) $shareLink->id,
                'token' => $shareLink->token,
                'file' => [
                    'id' => (string) $file->id,
                    'original_name' => $file->original_name,
                    'mime_type' => $file->mime_type,
                    'size' => (int) $file->size,
                    'created_at' => $file->created_at?->toISOString(),
                ],
                'download_count' => (int) $shareLink->download_count,
                'expires_at' => $shareLink->expires_at?->toISOString(),
                'requires_password' => $requiresPassword,
            ],
        ])->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    }

    public function download(string $token, Request $request): JsonResponse|BinaryFileResponse
    {
        // Always query fresh from DB — never trust stale state or cache
        $shareLink = ShareLink::with('file')->where('token', $token)->first();

        if (!$shareLink) {
            return response()->json([
                'message' => 'Share link tidak ditemukan',
            ], 404)->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
        }

        if ($shareLink->expires_at && $shareLink->expires_at->isPast()) {
            return response()->json([
                'message' => 'Share link sudah kedaluwarsa',
            ], 410)->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
        }

        $file = $shareLink->file;

        if (!$file) {
            return response()->json([
                'message' => 'File tidak ditemukan.',
            ], 404)->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
        }

        // Pastikan folder yang dibaca termasuk soft-deleted saat diperlukan.
        $file->load(['folder' => function ($q) {
            $q->withTrashed();
        }]);

        if ($file->folder?->trashed()) {
            return response()->json([
                'message' => 'File tidak ditemukan.',
            ], 404)->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
        }

        $providedPassword = is_string($request->input('password')) ? trim($request->input('password')) : '';
        if (!empty($shareLink->password)) {
            if ($providedPassword === '' || !Hash::check($providedPassword, $shareLink->password)) {
                return response()->json([
                    'message' => 'Password salah atau tidak diberikan.',
                    'requires_password' => true,
                ], 403)->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
            }
        }

        $disk = Storage::disk('local');

        if (!$disk->exists($file->path)) {
            return response()->json([
                'message' => 'File tidak ditemukan di storage',
            ], 404)->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
        }

        $shareLink->increment('download_count');

        $absolutePath = $disk->path($file->path);

        return response()->download($absolutePath, $file->original_name)
            ->setCache(['no_store' => true]);
    }
}


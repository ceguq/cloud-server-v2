<?php

namespace App\Http\Controllers;

use App\Models\File;
use App\Models\ShareLink;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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

    public function create(Request $request, File $file): JsonResponse
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

        $token = Str::random(40);

        $shareLink = ShareLink::create([
            'file_id' => $file->id,
            'token' => $token,
            'expires_at' => $validated['expires_at'] ?? null,
            'password' => $validated['password'] ?? null,
            'download_count' => 0,
        ]);

        return response()->json([
            'message' => 'Share link berhasil dibuat',
            'data' => $shareLink,
        ], 201);
    }

    public function destroy(Request $request, ShareLink $shareLink): JsonResponse
    {
        $user = $request->user();

        $shareLink->load('file');

        if (!$shareLink->file || $shareLink->file->user_id !== $user->id) {
            return response()->json([
                'message' => 'Share link tidak ditemukan',
            ], 403);
        }

        $shareLink->delete();

        return response()->json([
            'message' => 'Share link berhasil dihapus',
        ]);
    }

    public function show(string $token): JsonResponse
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
            ],
        ])->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    }

    public function download(string $token): JsonResponse|BinaryFileResponse
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


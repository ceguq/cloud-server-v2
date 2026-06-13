<?php

namespace App\Http\Controllers;

use App\Models\File;
use App\Services\ActivityLogService;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;


class FileController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $folderId = $request->query('folder_id');
        if ($folderId === '' || $folderId === 'null') {
            $folderId = null;
        }

        $query = File::query()->where('user_id', $user->id);

        if ($folderId === null) {
            $query->whereNull('folder_id');
        } else {
            // If folder is soft-deleted (trashed), do not return its files
            $folderExistsAndActive = \App\Models\Folder::where('id', $folderId)->exists();
            if (!$folderExistsAndActive) {
                return response()->json(['data' => []]);
            }

            $query->where('folder_id', $folderId);
        }


        $files = $query->orderBy('created_at', 'desc')->get();

        return response()->json([
            'data' => $files,
        ]);
    }

    public function upload(Request $request, ActivityLogService $activityLogService): JsonResponse
    {
        $user = $request->user();


        // Handle case when request comes but file is not readable by Laravel
        if (!$request->hasFile('file')) {
            $statusCode = 422;
            // Jika server menolak request karena body terlalu besar, Laravel biasanya mengembalikan 413.
            // Kita tetap kirim pesan JSON jelas agar UI bisa menampilkan.
            return response()->json([
                'message' => 'File terlalu besar untuk konfigurasi server/PHP. Cek upload_max_filesize dan post_max_size.',
                'errors' => [
                    'file' => ['File tidak terbaca oleh server. Kemungkinan ukuran file melebihi limit PHP upload_max_filesize/post_max_size.'],
                ],
            ], $statusCode);
        }

        // Tingkatkan batas validasi untuk menghindari kasus 6MB gagal karena mismatch limit.
        $validated = $request->validate([
            'file' => ['required', 'file', 'max:1024000'],

            'folder_id' => ['nullable', 'uuid', 'exists:folders,id'],
        ]);

        $uploaded = $validated['file'];
        $folderId = $validated['folder_id'] ?? null;

        $extension = $uploaded->getClientOriginalExtension();
        $extension = $extension ? strtolower($extension) : 'bin';

        $storedUuid = (string) Str::uuid();
        $storedName = $storedUuid . '.' . $extension;

        $relativePath = 'nimbusdrive/' . $storedName;

        $stored = Storage::disk('local')->putFileAs(
            'nimbusdrive',
            $uploaded,
            $storedName
        );

        if (!$stored) {
            throw ValidationException::withMessages([
                'file' => ['Gagal menyimpan file.'],
            ]);
        }

        $file = File::create([
            'user_id' => $user->id,
            'folder_id' => $folderId,
            'original_name' => $uploaded->getClientOriginalName(),
            'stored_name' => $storedName,
            'path' => $relativePath,
            'mime_type' => $uploaded->getMimeType(),
            'size' => $uploaded->getSize() ?? 0,
        ]);

        // Activity Log only after File::create succeeds
        $activityLogService->log(
            action: 'file.upload',
            description: 'Upload file berhasil: ' . $file->original_name,
            subject: $file,
            metadata: [
                'original_name' => $file->original_name,
                'size' => (int) $file->size,
                'mime_type' => $file->mime_type,
                'folder_id' => $file->folder_id,
            ],
            user: $user,
            request: $request
        );

        return response()->json([
            'message' => 'File berhasil diupload',
            'data' => $file,
        ], 201);

    }

    public function cancelUpload(Request $request, File $file, ActivityLogService $activityLogService): JsonResponse
    {
        $user = $request->user();

        // Ensure file belongs to the authenticated user
        if ($file->user_id !== $user->id) {
            return response()->json(['message' => 'File tidak ditemukan'], 404);
        }

        $originalName = $file->original_name;
        $filePath = $file->path;

        try {
            // Delete the physical file from storage
            $disk = Storage::disk('local');
            if ($disk->exists($filePath)) {
                $disk->delete($filePath);
            }

            // Delete the database record
            $file->forceDelete();

            // Log the cancellation
            try {
                $activityLogService->log(
                    action: 'file.upload.cancelled',
                    description: 'Upload dibatalkan: ' . $originalName,
                    metadata: [
                        'original_name' => $originalName,
                        'file_id' => (string) $file->id,
                    ],
                    user: $user,
                    request: $request
                );
            } catch (\Throwable $e) {
                // Log error should not affect main operation
            }

            return response()->json([
                'message' => 'Upload dibatalkan dan file dihapus',
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Gagal membatalkan upload',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function download(Request $request, File $file, ActivityLogService $activityLogService): JsonResponse|
    \Symfony\Component\HttpFoundation\BinaryFileResponse {
        $user = $request->user();


        if ($file->user_id !== $user->id) {

            return response()->json(['message' => 'File tidak ditemukan'], 404);
        }

        $disk = Storage::disk('local');

        if (!$disk->exists($file->path)) {
            return response()->json(['message' => 'File tidak ditemukan'], 404);
        }

        $absolutePath = $disk->path($file->path);

        $binaryResponse = response()->download($absolutePath, $file->original_name);

        // Activity Log only for authenticated My Files download
        $activityLogService->log(
            action: 'file.download',
            description: 'File didownload: ' . $file->original_name,
            subject: $file,
            user: $user,
            request: $request,
            metadata: [
                'file_id' => (string) $file->id,
                'original_name' => $file->original_name,
                'folder_id' => $file->folder_id,
                'mime_type' => $file->mime_type,
                'size' => (int) $file->size,
            ]
        );

        return $binaryResponse;
    }



    public function update(Request $request, File $file, ActivityLogService $activityLogService): JsonResponse
    {
        $user = $request->user();
        if ($file->user_id !== $user->id) {
            return response()->json(['message' => 'File tidak ditemukan'], 404);
        }

        $validated = $request->validate([
            'original_name' => ['required', 'string', 'max:255'],
        ]);

        $oldName = $file->original_name;
        $newName = $validated['original_name'];

        $file->update([
            'original_name' => $newName,
        ]);

        if ($oldName !== $newName) {
            $activityLogService->log(
                action: 'file.rename',
                description: 'Rename file: ' . $oldName . ' -> ' . $newName,
                subject: $file,
                user: $user,
                request: $request,
                metadata: [
                    'old_name' => $oldName,
                    'new_name' => $newName,
                    'folder_id' => $file->folder_id,
                ]
            );
        }

        return response()->json([
            'message' => 'File berhasil diubah',
            'data' => $file,
        ]);
    }


    public function destroy(Request $request, File $file, ActivityLogService $activityLogService): JsonResponse
    {
        $user = $request->user();

        if ($file->user_id !== $user->id) {
            return response()->json(['message' => 'File tidak ditemukan'], 404);
        }

        $originalName = $file->original_name;
        $folderId = $file->folder_id;
        $mimeType = $file->mime_type;
        $size = $file->size;

        // Soft delete (Trash). Do NOT delete the physical file.
        $file->delete();

        // Activity Log only after soft delete succeeds
        try {
            $activityLogService->log(
                action: 'file.trash',
                description: 'File dipindahkan ke Trash: ' . $originalName,
                subject: $file,
                user: $user,
                request: $request,
                metadata: [
                    'original_name' => $originalName,
                    'folder_id' => $folderId,
                    'mime_type' => $mimeType,
                    'size' => (int) $size,
                ]
            );
        } catch (\Throwable $e) {
            // must not affect main operation
        }

        return response()->json([
            'message' => 'File dipindahkan ke Trash',
        ]);
    }



    public function recent(Request $request): JsonResponse
    {
        $user = $request->user();

        $files = File::with('folder')
            ->where('user_id', $user->id)
            ->where(function ($query) {
                $query->whereNull('folder_id')
                    ->orWhereHas('folder', function ($q) {
                        // pastikan folder yang diloloskan adalah folder yang tidak ter-trashed
                        $q->whereNull('deleted_at');
                    });
            })
            ->latest()
            ->limit(10)
            ->get();

        $data = $files->map(function (File $file) {
            return [
                'id' => (string) $file->id,
                'original_name' => $file->original_name,
                'mime_type' => $file->mime_type,
                'size' => (int) $file->size,
                'size_human' => $this->formatBytes((int) $file->size),
                'folder_id' => $file->folder_id,
                'folder_name' => $file->folder?->name,
                'created_at' => $file->created_at?->toISOString(),
                'updated_at' => $file->updated_at?->toISOString(),
            ];
        });

        return response()->json([
            'data' => $data,
        ]);
    }


    private function formatBytes(int $bytes): string
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];

        if ($bytes <= 0) {
            return '0 B';
        }

        $i = (int) min((int) floor(log($bytes, 1024)), count($units) - 1);
        $value = $bytes / (1024 ** $i);

        $precision = $value >= 10 ? 1 : 2;

        return sprintf('%.' . $precision . 'f %s', $value, $units[$i]);
    }
}


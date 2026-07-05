<?php

namespace App\Http\Controllers;

use App\Models\File;
use App\Models\Folder;
use App\Services\ActivityLogService;

use Illuminate\Http\JsonResponse;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;


class TrashController extends Controller
{
    public function files(Request $request): JsonResponse
    {
        $user = $request->user();

        $files = File::onlyTrashed()
            ->where('user_id', $user->id)
            ->latest('deleted_at')
            ->get();

        return response()->json([
            'data' => $files,
        ]);
    }

    public function restoreFile(Request $request, string $id, ActivityLogService $activityLogService): JsonResponse
    {
        $user = $request->user();


        $file = File::onlyTrashed()
            ->where('user_id', $user->id)
            ->where('id', $id)
            ->first();

        if (!$file) {
            return response()->json(['message' => 'File tidak ditemukan.'], 404);
        }

        $folderIsTrashed = false;

        if ($file->folder_id) {
            $parentFolder = Folder::withTrashed()->find($file->folder_id);
            $folderIsTrashed = $parentFolder && $parentFolder->trashed();
        }

        $originalName = $file->original_name;
        $previousFolderId = $file->folder_id;
        $mimeType = $file->mime_type;
        $size = $file->size;

        // Jika folder induk masih soft deleted, kembalikan file ke root
        if ($folderIsTrashed) {
            $file->folder_id = null;
            $file->save();
        }

        $restoredFolderId = $file->folder_id;

        $file->restore();

        // Activity Log only after restore succeeds
        try {
            $activityLogService->log(
                action: 'file.restore',
                description: 'File berhasil direstore: ' . $file->original_name,
                subject: $file,
                user: $user,
                request: $request,
                metadata: [
                    'original_name' => $originalName,
                    'previous_folder_id' => $previousFolderId,
                    'restored_folder_id' => $restoredFolderId,
                    'mime_type' => $mimeType,
                    'size' => (int) $size,
                ]
            );
        } catch (\Throwable $e) {
            // must not affect main operation
        }

        return response()->json([

            'message' => 'File berhasil direstore',
            'data' => $file,
        ]);
    }


    public function forceDeleteFile(Request $request, string $id, ActivityLogService $activityLogService): JsonResponse
    {

        $user = $request->user();

        $file = File::onlyTrashed()
            ->where('user_id', $user->id)
            ->where('id', $id)
            ->first();

        if (!$file) {
            return response()->json(['message' => 'File tidak ditemukan.'], 404);
        }

        $fileId = $file->id;
        $originalName = $file->original_name;
        $folderId = $file->folder_id;
        $mimeType = $file->mime_type;
        $size = $file->size;

        // Hapus file fisik dari storage jika ada
        if (!empty($file->path)) {
            Storage::disk('local')->delete($file->path);
        }

        $file->forceDelete();

        // Activity Log only after forceDelete succeeds
        try {
            $activityLogService->log(
                action: 'file.force_delete',
                description: 'File dihapus permanen: ' . $originalName,
                subject: $file,
                user: $request->user(),
                request: $request,
                metadata: [
                    'file_id' => $fileId,
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
            'message' => 'File berhasil dihapus permanen',
        ]);

    }

    public function folders(Request $request): JsonResponse
    {
        $user = $request->user();

        $folders = Folder::onlyTrashed()
            ->where('user_id', $user->id)
            ->latest('deleted_at')
            ->get();

        return response()->json([
            'data' => $folders,
        ]);
    }

    public function restoreFolder(Request $request, string $id, ActivityLogService $activityLogService): JsonResponse
    {
        $user = $request->user();

        $folder = Folder::onlyTrashed()
            ->where('user_id', $user->id)
            ->where('id', $id)
            ->first();

        if (!$folder) {
            return response()->json(['message' => 'Folder tidak ditemukan.'], 404);
        }

        $oldName = $folder->name;
        $oldParentId = $folder->parent_id;

        $this->restoreFolderRecursive($folder);

        // Activity Log only after recursive restore succeeds
        try {
            $activityLogService->log(
                action: 'folder.restore',
                description: 'Folder berhasil direstore: ' . $folder->name,
                subject: $folder,
                user: $request->user(),
                request: $request,
                metadata: [
                    'name' => $oldName,
                    'parent_id' => $oldParentId,
                ]
            );
        } catch (\Throwable $e) {
            // must not affect main operation
        }

        // include nested state
        return response()->json([
            'message' => 'Folder berhasil direstore',
            'data' => $folder,
        ]);

    }


    public function forceDeleteFolder(Request $request, string $id, ActivityLogService $activityLogService): JsonResponse
    {
        $user = $request->user();

        $folder = Folder::onlyTrashed()
            ->where('user_id', $user->id)
            ->where('id', $id)
            ->first();

        if (!$folder) {
            return response()->json(['message' => 'Folder tidak ditemukan.'], 404);
        }

        $folderId = $folder->id;
        $folderName = $folder->name;
        $parentId = $folder->parent_id;

        $this->forceDeleteFolderRecursive($folder);

        // Activity Log only after recursive force delete succeeds
        try {
            $activityLogService->log(
                action: 'folder.force_delete',
                description: 'Folder dihapus permanen: ' . $folderName,
                subject: $folder,
                user: $request->user(),
                request: $request,
                metadata: [
                    'folder_id' => $folderId,
                    'name' => $folderName,
                    'parent_id' => $parentId,
                ]
            );
        } catch (\Throwable $e) {
            // must not affect main operation
        }

        return response()->json([
            'message' => 'Folder berhasil dihapus permanen',
        ]);

    }

    private function restoreFolderRecursive(Folder $folder): void
    {
        $folder->restore();

        // Restore child folders that are trashed
        $folder->childrenWithTrashed()->onlyTrashed()->get()->each(function (Folder $child) {
            $this->restoreFolderRecursive($child);
        });

        // Restore files inside this folder that are trashed
        $folder->files()
            ->onlyTrashed()
            ->get()
            ->each(function (File $file) {
                $file->restore();
            });
    }

    private function forceDeleteFolderRecursive(Folder $folder): void
    {
        // Force delete child folders first
        $children = Folder::withTrashed()
            ->where('parent_id', $folder->id)
            ->get();

        foreach ($children as $child) {
            // Only process those that are trashed (soft deleted)
            if ($child->deleted_at !== null) {
                $this->forceDeleteFolderRecursive($child);
            }
        }

        // Force delete files inside this folder (and delete physical storage)
        // IMPORTANT: use withTrashed() because files are soft deleted.
        $files = File::withTrashed()->where('folder_id', $folder->id)->get();

        foreach ($files as $file) {
            // Only force delete those that are currently trashed.
            if ($file->deleted_at === null) {
                continue;
            }

            if (!empty($file->path)) {
                Storage::disk('local')->delete($file->path);
            }

            $file->forceDelete();
        }

        $folder->forceDelete();
    }

}


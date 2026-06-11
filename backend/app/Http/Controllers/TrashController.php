<?php

namespace App\Http\Controllers;

use App\Models\File;
use App\Models\Folder;
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

    public function restoreFile(Request $request, string $id): JsonResponse
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

        // Jika folder induk masih soft deleted, kembalikan file ke root
        if ($folderIsTrashed) {
            $file->folder_id = null;
            $file->save();
        }

        $file->restore();

        return response()->json([
            'message' => 'File berhasil direstore',
            'data' => $file,
        ]);
    }


    public function forceDeleteFile(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        $file = File::onlyTrashed()
            ->where('user_id', $user->id)
            ->where('id', $id)
            ->first();

        if (!$file) {
            return response()->json(['message' => 'File tidak ditemukan.'], 404);
        }

        // Hapus file fisik dari storage jika ada
        if (!empty($file->path)) {
            Storage::disk('local')->delete($file->path);
        }

        $file->forceDelete();

        return response()->json([
            'message' => 'File berhasil dihapus permanen',
        ]);
    }

    public function folders(Request $request): JsonResponse
    {
        // TODO: nanti folder perlu user_id untuk multi-user.
        $folders = Folder::onlyTrashed()
            ->whereNull('parent_id')
            ->latest('deleted_at')
            ->get();

        return response()->json([
            'data' => $folders,
        ]);
    }

    public function restoreFolder(Request $request, string $id): JsonResponse
    {
        $folder = Folder::onlyTrashed()->where('id', $id)->first();

        if (!$folder) {
            return response()->json(['message' => 'Folder tidak ditemukan.'], 404);
        }

        $this->restoreFolderRecursive($folder);

        // include nested state
        return response()->json([
            'message' => 'Folder berhasil direstore',
            'data' => $folder,
        ]);
    }


    public function forceDeleteFolder(Request $request, string $id): JsonResponse
    {
        $folder = Folder::onlyTrashed()->where('id', $id)->first();

        if (!$folder) {
            return response()->json(['message' => 'Folder tidak ditemukan.'], 404);
        }

        $this->forceDeleteFolderRecursive($folder);

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


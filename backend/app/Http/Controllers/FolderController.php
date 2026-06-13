<?php

namespace App\Http\Controllers;

use App\Models\Folder;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;




class FolderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $parentId = $request->query('parent_id');

        // Jika query kosong/null -> root
        if ($parentId === '' || $parentId === 'null') {
            $parentId = null;
        }

        $search = $request->query('search');
        $q = $request->query('q');

        $keyword = trim((string) ($search !== null && $search !== '' ? $search : ($q ?? '')));

        $foldersQuery = Folder::query();

        // If searching: global search by active folders name (exclude soft deleted)
        if ($keyword !== '') {
            $foldersQuery
                ->whereNull('deleted_at')
                ->where('name', 'like', '%' . $keyword . '%')
                ->orderBy('name');
        } else {
            // Legacy behavior: filter by parent_id (root vs children)
            $foldersQuery
                ->when($parentId === null, function ($q) {
                    $q->whereNull('parent_id');
                }, function ($q) use ($parentId) {
                    $q->where('parent_id', $parentId);
                })
                ->orderBy('name');
        }

        $folders = $foldersQuery->get();

        return response()->json([
            'data' => $folders,
        ]);
    }


    public function store(Request $request, ActivityLogService $activityLogService): JsonResponse
    {

        $validator = Validator::make($request->all(), [
            'name' => ['required', 'string', 'max:255'],
            'parent_id' => ['nullable', 'uuid', 'exists:folders,id'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validasi gagal',
                'errors' => $validator->errors(),
            ], 422);
        }

        $validated = $validator->validated();
        $parentId = $validated['parent_id'] ?? null;

        $existing = Folder::query()
            ->where('name', $validated['name'])
            ->when($parentId === null, function ($q) {
                $q->whereNull('parent_id');
            }, function ($q) use ($parentId) {
                $q->where('parent_id', $parentId);
            })
            ->first();

        if ($existing) {
            return response()->json([
                'message' => 'Nama folder sudah ada pada parent yang sama',
            ], 409);
        }

        $folder = Folder::create([
            'name' => $validated['name'],
            'parent_id' => $parentId,
        ]);

        // Activity Log only after Folder::create succeeds
        $activityLogService->log(
            action: 'folder.create',
            description: 'Create folder berhasil: ' . $folder->name,
            subject: $folder,
            metadata: [
                'name' => $folder->name,
                'parent_id' => $folder->parent_id,
            ],
            user: $request->user(),
            request: $request
        );

        return response()->json([
            'message' => 'Folder dibuat',
            'data' => $folder,
        ], 201);

    }

    public function update(Request $request, Folder $folder, ActivityLogService $activityLogService): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => ['required', 'string', 'max:255'],
            'parent_id' => ['nullable', 'uuid', 'exists:folders,id'],
        ]);


        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validasi gagal',
                'errors' => $validator->errors(),
            ], 422);
        }

        $validated = $validator->validated();

        $oldName = $folder->name;
        $oldParentId = $folder->parent_id;

        $parentId = $validated['parent_id'] ?? null;


        $existing = Folder::query()
            ->where('name', $validated['name'])
            ->where('id', '!=', $folder->id)
            ->when($parentId === null, function ($q) {
                $q->whereNull('parent_id');
            }, function ($q) use ($parentId) {
                $q->where('parent_id', $parentId);
            })
            ->first();

        if ($existing) {
            return response()->json([
                'message' => 'Nama folder sudah ada pada parent yang sama',
            ], 409);
        }

        $newName = $validated['name'];
        $newParentId = $parentId;

        $folder->update([
            'name' => $newName,
            'parent_id' => $newParentId,
        ]);

        if ($oldName !== $newName) {
            $activityLogService->log(
                action: 'folder.rename',
                description: 'Rename folder: ' . $oldName . ' -> ' . $newName,
                subject: $folder,
                user: $request->user(),
                request: $request,
                metadata: [
                    'old_name' => $oldName,
                    'new_name' => $newName,
                    'old_parent_id' => $oldParentId,
                    'new_parent_id' => $newParentId,
                ]
            );
        }

        return response()->json([
            'message' => 'Folder diperbarui',
            'data' => $folder,
        ]);

    }

    public function destroy(Request $request, Folder $folder, ActivityLogService $activityLogService): JsonResponse
    {
        $user = $request->user();

        $oldName = $folder->name;
        $oldParentId = $folder->parent_id;

        $success = false;
        try {
            $this->deleteFolderRecursive($folder);
            $success = true;
        } catch (\Throwable $e) {
            $success = false;
        }

        if ($success) {
            $activityLogService->log(
                action: 'folder.trash',
                description: 'Folder dipindahkan ke Trash: ' . $oldName,
                subject: $folder,
                user: $user,
                request: $request,
                metadata: [
                    'name' => $oldName,
                    'parent_id' => $oldParentId,
                ]
            );
        }

        return response()->json([
            'message' => 'Folder dipindahkan ke Trash',
        ]);
    }


    private function deleteFolderRecursive(Folder $folder): void
    {
        // Soft delete all active child folders
        $folder->children()->get()->each(function (Folder $child) {
            $this->deleteFolderRecursive($child);
        });

        // Soft delete all files in current folder (DO NOT delete physical storage)
        $folder->files()->get()->each(function ($file) {
            $file->delete();
        });

        // Soft delete folder itself
        $folder->delete();


    }

}



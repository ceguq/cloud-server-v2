<?php

namespace App\Http\Controllers;

use App\Models\Folder;
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

        $folders = Folder::query()
            ->when($parentId === null, function ($q) {
                $q->whereNull('parent_id');
            }, function ($q) use ($parentId) {
                $q->where('parent_id', $parentId);
            })
            ->orderBy('name')
            ->get();

        return response()->json([
            'data' => $folders,
        ]);
    }

    public function store(Request $request): JsonResponse
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

        return response()->json([
            'message' => 'Folder dibuat',
            'data' => $folder,
        ], 201);
    }

    public function update(Request $request, Folder $folder): JsonResponse
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

        $folder->update([
            'name' => $validated['name'],
            'parent_id' => $parentId,
        ]);

        return response()->json([
            'message' => 'Folder diperbarui',
            'data' => $folder,
        ]);
    }

    public function destroy(Folder $folder): JsonResponse
    {
        $this->deleteFolderRecursive($folder);

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



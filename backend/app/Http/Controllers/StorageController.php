<?php

namespace App\Http\Controllers;

use App\Models\File;
use App\Models\Folder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StorageController extends Controller
{
    public function info(Request $request): JsonResponse
    {
        $user = $request->user();

        // If auth is required (auth:sanctum), $user should never be null.
        // Keeping it defensive to avoid unexpected 500 errors.
        if (!$user) {
            return response()->json([
                'data' => null,
                'message' => 'Unauthenticated.',
            ], 401);
        }

        $usedBytes = (int) File::where('user_id', $user->id)->sum('size');

        $fileCount = (int) File::where('user_id', $user->id)->count();

        $folderCount = (int) Folder::where('user_id', $user->id)->count();

        $limitBytes = 100 * 1024 * 1024 * 1024; // 100 GB
        $usagePercent = $limitBytes > 0
            ? round(($usedBytes / $limitBytes) * 100, 2)
            : 0;

        return response()->json([
            'data' => [
                'used_bytes' => $usedBytes,
                'used_human' => $this->formatBytes($usedBytes),
                'limit_bytes' => $limitBytes,
                'limit_human' => $this->formatBytes($limitBytes),
                'usage_percent' => $usagePercent,
                'file_count' => $fileCount,
                'folder_count' => $folderCount,
            ],
        ]);
    }



    public function breakdown(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'data' => null,
                'message' => 'Unauthenticated.',
            ], 401);
        }

        $limitBytes = 100 * 1024 * 1024 * 1024; // 100 GB

        $files = File::where('user_id', $user->id)->get(['original_name', 'mime_type', 'size']);

        $usedBytes = 0;

        $categoryBytes = [
            'photos' => 0,
            'videos' => 0,
            'documents' => 0,
            'music' => 0,
            'others' => 0,
        ];

        foreach ($files as $file) {
            $size = (int) ($file->size ?? 0);
            $usedBytes += $size;

            $categoryKey = $this->getStorageCategory(
                $file->mime_type ? (string) $file->mime_type : null,
                $file->original_name ? (string) $file->original_name : null,
            );

            if (!isset($categoryBytes[$categoryKey])) {
                $categoryKey = 'others';
            }

            $categoryBytes[$categoryKey] += $size;
        }

        $usagePercent = $limitBytes > 0
            ? round(($usedBytes / $limitBytes) * 100, 2)
            : 0;

        $categories = [
            ['key' => 'photos', 'name' => 'Photos'],
            ['key' => 'videos', 'name' => 'Videos'],
            ['key' => 'documents', 'name' => 'Documents'],
            ['key' => 'music', 'name' => 'Music'],
            ['key' => 'others', 'name' => 'Others'],
        ];

        $dataCategories = [];
        foreach ($categories as $cat) {
            $bytes = (int) ($categoryBytes[$cat['key']] ?? 0);

            $sharePercent = $usedBytes > 0
                ? round(($bytes / $usedBytes) * 100, 2)
                : 0;

            $quotaPercent = $limitBytes > 0
                ? round(($bytes / $limitBytes) * 100, 2)
                : 0;

            $dataCategories[] = [
                'key' => $cat['key'],
                'name' => $cat['name'],
                'bytes' => $bytes,
                'human' => $this->formatBytes($bytes),
                'share_percent' => $sharePercent,
                'quota_percent' => $quotaPercent,
            ];
        }

        return response()->json([
            'data' => [
                'used_bytes' => (int) $usedBytes,
                'used_human' => $this->formatBytes((int) $usedBytes),
                'limit_bytes' => $limitBytes,
                'limit_human' => $this->formatBytes($limitBytes),
                'usage_percent' => $usagePercent,
                'categories' => $dataCategories,
            ],
        ]);
    }

    private function getStorageCategory(?string $mimeType, ?string $originalName): string
    {
        $mimeType = $mimeType ? strtolower(trim($mimeType)) : '';
        $originalName = $originalName ? trim($originalName) : '';

        $ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));

        $photoExt = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
        if (str_starts_with($mimeType, 'image/') || in_array($ext, $photoExt, true)) {
            return 'photos';
        }

        $videoExt = ['mp4', 'mkv', 'mov', 'webm', 'avi'];
        if (str_starts_with($mimeType, 'video/') || in_array($ext, $videoExt, true)) {
            return 'videos';
        }

        $musicExt = ['mp3', 'wav', 'ogg', 'm4a', 'flac'];
        if (str_starts_with($mimeType, 'audio/') || in_array($ext, $musicExt, true)) {
            return 'music';
        }


        $docExt = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'md', 'json'];
        $docMime = $mimeType;
        $hasDocKeyword = preg_match('/word|excel|powerpoint|spreadsheet|presentation|document/i', $originalName) === 1
            || preg_match('/word|excel|powerpoint|spreadsheet|presentation|document/i', $docMime) === 1;

        if (
            $docMime === 'application/pdf'
            || str_starts_with($docMime, 'text/')
            || $hasDocKeyword
            || in_array($ext, $docExt, true)
        ) {
            return 'documents';
        }

        // If mime matches category, but extension missing, allow fallback by mime rules only.
        if (str_starts_with($mimeType, 'image/')) {
            return 'photos';
        }
        if (str_starts_with($mimeType, 'video/')) {
            return 'videos';
        }
        if (str_starts_with($mimeType, 'audio/')) {
            return 'music';
        }
        if (
            $mimeType === 'application/pdf'
            || str_starts_with($mimeType, 'text/')
            || $hasDocKeyword
        ) {
            return 'documents';
        }

        return 'others';
    }

    private function formatBytes(int $bytes): string
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $bytesFloat = (float) $bytes;

        if ($bytesFloat <= 0) {
            return '0 B';
        }

        $i = (int) min(floor(log($bytesFloat, 1024)), count($units) - 1);
        $value = $bytesFloat / (1024 ** $i);

        $precision = $value >= 10 ? 1 : 2;

        return sprintf('%.' . $precision . 'f %s', $value, $units[$i]);
    }
}


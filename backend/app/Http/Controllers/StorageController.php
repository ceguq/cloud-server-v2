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

        // TODO: folders currently do not have user_id, so for now we use global count.
        $folderCount = (int) Folder::count();

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


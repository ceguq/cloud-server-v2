<?php

namespace App\Services;

use Illuminate\Support\Facades\Storage;
use Throwable;

class StorageFilesystemUsageService
{
    public function __construct(
        private readonly FilesystemStatsProvider $filesystemStats,
    ) {}

    /**
     * @return array{
     *     filesystem_available: bool,
     *     used_bytes: int|null,
     *     used_human: string|null,
     *     limit_bytes: int|null,
     *     limit_human: string|null,
     *     free_bytes: int|null,
     *     free_human: string|null,
     *     usage_percent: float|null,
     *     free_percent: float|null
     * }
     */
    public function getUsage(?int $managedUsedBytes = null): array
    {
        try {
            $path = Storage::disk('local')->path('');
            if (! is_dir($path)) {
                return $this->unavailable();
            }

            $totalBytes = $this->filesystemStats->totalSpace($path);
            $freeBytes = $this->filesystemStats->freeSpace($path);
        } catch (Throwable) {
            return $this->unavailable();
        }

        if (
            $totalBytes === false
            || $freeBytes === false
            || ! is_finite($totalBytes)
            || ! is_finite($freeBytes)
            || $totalBytes <= 0
            || $freeBytes < 0
            || $freeBytes > $totalBytes
        ) {
            return $this->unavailable();
        }

        $totalBytes = (int) $totalBytes;
        $freeBytes = (int) $freeBytes;
        $usedBytes = $managedUsedBytes !== null
            ? max(0, $managedUsedBytes)
            : $totalBytes - $freeBytes;

        return [
            'filesystem_available' => true,
            'used_bytes' => $usedBytes,
            'used_human' => $this->formatBytes($usedBytes),
            'limit_bytes' => $totalBytes,
            'limit_human' => $this->formatBytes($totalBytes),
            'free_bytes' => $freeBytes,
            'free_human' => $this->formatBytes($freeBytes),
            'usage_percent' => round(($usedBytes / $totalBytes) * 100, 2),
            'free_percent' => round(($freeBytes / $totalBytes) * 100, 2),
        ];
    }

    private function unavailable(): array
    {
        return [
            'filesystem_available' => false,
            'used_bytes' => null,
            'used_human' => null,
            'limit_bytes' => null,
            'limit_human' => null,
            'free_bytes' => null,
            'free_human' => null,
            'usage_percent' => null,
            'free_percent' => null,
        ];
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

        return sprintf('%.'.$precision.'f %s', $value, $units[$i]);
    }
}

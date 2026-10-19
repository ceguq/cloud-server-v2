<?php

namespace App\Services;

class NativeFilesystemStatsProvider implements FilesystemStatsProvider
{
    public function totalSpace(string $path): float|false
    {
        return @disk_total_space($path);
    }

    public function freeSpace(string $path): float|false
    {
        return @disk_free_space($path);
    }
}

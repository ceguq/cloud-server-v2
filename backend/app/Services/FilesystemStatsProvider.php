<?php

namespace App\Services;

interface FilesystemStatsProvider
{
    public function totalSpace(string $path): float|false;

    public function freeSpace(string $path): float|false;
}

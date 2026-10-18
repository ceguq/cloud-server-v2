<?php

declare(strict_types=1);

namespace App\Services;

final class AccountDeletePhysicalLocalFilesCleanupResult
{
    public function __construct(
        public readonly bool $executed,
        public readonly int $deletedCount,
    ) {}

    public static function rejected(int $deletedCount = 0): self
    {
        return new self(
            executed: false,
            deletedCount: $deletedCount,
        );
    }

    public static function executed(int $deletedCount): self
    {
        return new self(
            executed: true,
            deletedCount: $deletedCount,
        );
    }
}

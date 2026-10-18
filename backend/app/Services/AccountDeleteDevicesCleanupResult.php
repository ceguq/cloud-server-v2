<?php

declare(strict_types=1);

namespace App\Services;

final class AccountDeleteDevicesCleanupResult
{
    public function __construct(
        public readonly bool $executed,
        public readonly int $deletedCount,
    ) {}

    public static function rejected(): self
    {
        return new self(
            executed: false,
            deletedCount: 0,
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

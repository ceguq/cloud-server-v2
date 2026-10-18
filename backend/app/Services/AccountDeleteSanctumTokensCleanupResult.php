<?php

namespace App\Services;

final class AccountDeleteSanctumTokensCleanupResult
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

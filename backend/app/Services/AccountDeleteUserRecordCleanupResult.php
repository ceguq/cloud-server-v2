<?php

declare(strict_types=1);

namespace App\Services;

final class AccountDeleteUserRecordCleanupResult
{
    public readonly bool $executed;

    public readonly int $deletedCount;

    private function __construct(bool $executed, int $deletedCount)
    {
        $this->executed = $executed;
        $this->deletedCount = $deletedCount;
    }

    public static function rejected(): self
    {
        return new self(false, 0);
    }

    public static function executed(int $deletedCount): self
    {
        return new self(true, $deletedCount);
    }
}

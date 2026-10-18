<?php

namespace App\Services;

final class AccountDeleteCleanupCategoryExecutionResult
{
    public const OUTCOME_REJECTED = 'rejected';

    public const OUTCOME_COMPLETED = 'completed';

    public const OUTCOME_BOOKKEEPING_FAILED = 'bookkeeping_failed';

    public readonly string $category;

    public readonly string $outcome;

    public readonly bool $cleanupExecuted;

    public readonly bool $categoryCompleted;

    private function __construct(
        string $category,
        string $outcome,
        bool $cleanupExecuted,
        bool $categoryCompleted,
    ) {
        $this->category = $category;
        $this->outcome = $outcome;
        $this->cleanupExecuted = $cleanupExecuted;
        $this->categoryCompleted = $categoryCompleted;
    }

    public static function rejected(string $category): self
    {
        return new self(
            category: $category,
            outcome: self::OUTCOME_REJECTED,
            cleanupExecuted: false,
            categoryCompleted: false,
        );
    }

    public static function completed(string $category): self
    {
        return new self(
            category: $category,
            outcome: self::OUTCOME_COMPLETED,
            cleanupExecuted: true,
            categoryCompleted: true,
        );
    }

    public static function completedWithoutExecution(string $category): self
    {
        return new self(
            category: $category,
            outcome: self::OUTCOME_COMPLETED,
            cleanupExecuted: false,
            categoryCompleted: true,
        );
    }

    public static function bookkeepingFailed(
        string $category,
        bool $cleanupExecuted = true,
    ): self {
        return new self(
            category: $category,
            outcome: self::OUTCOME_BOOKKEEPING_FAILED,
            cleanupExecuted: $cleanupExecuted,
            categoryCompleted: false,
        );
    }
}

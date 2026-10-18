<?php

declare(strict_types=1);

namespace App\Services;

final class AccountDeleteCleanupRemediationResult
{
    public const OUTCOME_COMPLETED = 'completed';

    public const OUTCOME_CLEANUP_PENDING = 'cleanup_pending';

    public const OUTCOME_REJECTED = 'rejected';

    public const OUTCOME_BOOKKEEPING_FAILED = 'bookkeeping_failed';

    /**
     * @param  list<AccountDeleteCleanupCategoryExecutionResult>  $categoryResults
     */
    public function __construct(
        public readonly string $outcome,
        public readonly array $categoryResults = [],
    ) {}
}

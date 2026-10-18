<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\AccountDeleteCleanupManifest;
use Illuminate\Support\Facades\Cache;

final class AccountDeleteCleanupRemediationService
{
    private const LOCK_SECONDS = 604800;

    public function __construct(
        private readonly AccountDeleteCleanupCoordinator $coordinator,
        private readonly AccountDeleteCleanupManifestService $manifestService,
    ) {}

    public function resume(string $operationId): AccountDeleteCleanupRemediationResult
    {
        $manifest = AccountDeleteCleanupManifest::query()
            ->where('operation_id', $operationId)
            ->first();

        if (! $manifest) {
            return new AccountDeleteCleanupRemediationResult(
                AccountDeleteCleanupRemediationResult::OUTCOME_REJECTED,
            );
        }

        $lock = Cache::lock(
            'account-delete-remediation:'.hash('sha256', $manifest->operation_id),
            self::LOCK_SECONDS,
        );

        if (! $lock->get()) {
            return new AccountDeleteCleanupRemediationResult(
                AccountDeleteCleanupRemediationResult::OUTCOME_REJECTED,
            );
        }

        try {
            return $this->resumeLocked($operationId);
        } finally {
            $lock->release();
        }
    }

    private function resumeLocked(string $operationId): AccountDeleteCleanupRemediationResult
    {
        $manifest = AccountDeleteCleanupManifest::query()
            ->where('operation_id', $operationId)
            ->first();

        if (! $manifest) {
            return new AccountDeleteCleanupRemediationResult(
                AccountDeleteCleanupRemediationResult::OUTCOME_REJECTED,
            );
        }

        if ($manifest->status === 'completed') {
            return new AccountDeleteCleanupRemediationResult(
                AccountDeleteCleanupRemediationResult::OUTCOME_COMPLETED,
            );
        }

        if ($manifest->status === 'cleanup_pending') {
            if (! $this->manifestService->beginRetryAttempt($manifest)) {
                return new AccountDeleteCleanupRemediationResult(
                    AccountDeleteCleanupRemediationResult::OUTCOME_REJECTED,
                );
            }

            $manifest = $manifest->fresh();
            if (! $manifest) {
                return new AccountDeleteCleanupRemediationResult(
                    AccountDeleteCleanupRemediationResult::OUTCOME_REJECTED,
                );
            }
        } elseif ($manifest->status !== 'in_progress') {
            return new AccountDeleteCleanupRemediationResult(
                AccountDeleteCleanupRemediationResult::OUTCOME_REJECTED,
            );
        }

        $categoryResults = $this->coordinator->execute($manifest);
        $failedResult = null;

        foreach ($categoryResults as $categoryResult) {
            if (! $categoryResult->categoryCompleted) {
                $failedResult = $categoryResult;
                break;
            }
        }

        if ($failedResult !== null) {
            $this->manifestService->markCategoryFailed(
                $manifest,
                $failedResult->category,
            );
        }

        $authoritativeManifest = $manifest->fresh();

        if ($authoritativeManifest?->status === 'completed') {
            return new AccountDeleteCleanupRemediationResult(
                AccountDeleteCleanupRemediationResult::OUTCOME_COMPLETED,
                $categoryResults,
            );
        }

        if ($authoritativeManifest?->status === 'cleanup_pending') {
            return new AccountDeleteCleanupRemediationResult(
                AccountDeleteCleanupRemediationResult::OUTCOME_CLEANUP_PENDING,
                $categoryResults,
            );
        }

        return new AccountDeleteCleanupRemediationResult(
            AccountDeleteCleanupRemediationResult::OUTCOME_BOOKKEEPING_FAILED,
            $categoryResults,
        );
    }
}

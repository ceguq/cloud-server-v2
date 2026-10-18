<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\AccountDeleteCleanupManifest;

final class AccountDeleteUserRecordCleanupOrchestrator
{
    public function __construct(
        private readonly AccountDeleteUserRecordCleanupService $cleanupService,
        private readonly AccountDeleteCleanupManifestService $manifestService,
    ) {}

    public function executeWithResult(
        AccountDeleteCleanupManifest $manifest,
    ): AccountDeleteCleanupCategoryExecutionResult {
        $authoritativeManifest = $manifest->fresh();
        if ($authoritativeManifest !== null
            && ($authoritativeManifest->category_states['user_record'] ?? null) === 'completed') {
            if ($this->completeManifest($authoritativeManifest)) {
                return AccountDeleteCleanupCategoryExecutionResult::completedWithoutExecution('user_record');
            }

            return AccountDeleteCleanupCategoryExecutionResult::bookkeepingFailed(
                'user_record',
                false,
            );
        }

        $cleanupResult = $this->cleanupService->cleanupWithResult($manifest);
        if (! $cleanupResult->executed) {
            return AccountDeleteCleanupCategoryExecutionResult::rejected('user_record');
        }

        if (! $this->manifestService->markCategoryCompleted($manifest, 'user_record')) {
            return AccountDeleteCleanupCategoryExecutionResult::bookkeepingFailed('user_record');
        }

        if (! $this->completeManifest($manifest)) {
            return AccountDeleteCleanupCategoryExecutionResult::bookkeepingFailed('user_record');
        }

        return AccountDeleteCleanupCategoryExecutionResult::completed('user_record');
    }

    public function execute(
        AccountDeleteCleanupManifest $manifest,
    ): bool {
        return $this->executeWithResult($manifest)->categoryCompleted;
    }

    private function completeManifest(AccountDeleteCleanupManifest $manifest): bool
    {
        if ($this->manifestService->completeIfAllCategoriesCompleted($manifest)) {
            return true;
        }

        return $manifest->fresh()?->status === 'completed';
    }
}

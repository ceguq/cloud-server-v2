<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\AccountDeleteCleanupManifest;

final class AccountDeleteActivityLogsCleanupOrchestrator
{
    public function __construct(
        private readonly AccountDeleteActivityLogsCleanupService $cleanupService,
        private readonly AccountDeleteCleanupManifestService $manifestService,
    ) {}

    public function executeWithResult(
        AccountDeleteCleanupManifest $manifest,
    ): AccountDeleteCleanupCategoryExecutionResult {
        $cleanupResult = $this->cleanupService->cleanupWithResult($manifest);

        if (! $cleanupResult->executed) {
            return AccountDeleteCleanupCategoryExecutionResult::rejected(
                'activity_logs',
            );
        }

        $categoryCompleted = $this->manifestService->markCategoryCompleted(
            $manifest,
            'activity_logs',
        );

        if ($categoryCompleted) {
            return AccountDeleteCleanupCategoryExecutionResult::completed(
                'activity_logs',
            );
        }

        return AccountDeleteCleanupCategoryExecutionResult::bookkeepingFailed(
            'activity_logs',
        );
    }

    public function execute(
        AccountDeleteCleanupManifest $manifest,
    ): bool {
        return $this->executeWithResult($manifest)->categoryCompleted;
    }
}

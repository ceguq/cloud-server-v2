<?php

namespace App\Services;

use App\Models\AccountDeleteCleanupManifest;

final class AccountDeleteShareLinksCleanupOrchestrator
{
    public function __construct(
        private readonly AccountDeleteShareLinksCleanupService $cleanupService,
        private readonly AccountDeleteCleanupManifestService $manifestService,
    ) {}

    public function executeWithResult(
        AccountDeleteCleanupManifest $manifest,
    ): AccountDeleteCleanupCategoryExecutionResult {
        $cleanupResult = $this->cleanupService->cleanupWithResult($manifest);

        if (! $cleanupResult->executed) {
            return AccountDeleteCleanupCategoryExecutionResult::rejected(
                'share_links',
            );
        }

        $categoryCompleted = $this->manifestService->markCategoryCompleted(
            $manifest,
            'share_links',
        );

        if ($categoryCompleted) {
            return AccountDeleteCleanupCategoryExecutionResult::completed(
                'share_links',
            );
        }

        return AccountDeleteCleanupCategoryExecutionResult::bookkeepingFailed(
            'share_links',
        );
    }

    public function execute(
        AccountDeleteCleanupManifest $manifest,
    ): bool {
        return $this->executeWithResult($manifest)->categoryCompleted;
    }
}

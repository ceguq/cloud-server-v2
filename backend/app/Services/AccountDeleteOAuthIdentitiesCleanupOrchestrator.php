<?php

namespace App\Services;

use App\Models\AccountDeleteCleanupManifest;

final class AccountDeleteOAuthIdentitiesCleanupOrchestrator
{
    public function __construct(
        private readonly AccountDeleteOAuthIdentitiesCleanupService $cleanupService,
        private readonly AccountDeleteCleanupManifestService $manifestService,
    ) {}

    public function executeWithResult(
        AccountDeleteCleanupManifest $manifest,
    ): AccountDeleteCleanupCategoryExecutionResult {
        $cleanupResult = $this->cleanupService->cleanupWithResult(
            $manifest,
        );

        if (! $cleanupResult->executed) {
            return AccountDeleteCleanupCategoryExecutionResult::rejected(
                'oauth_identities',
            );
        }

        $categoryCompleted = $this->manifestService->markCategoryCompleted(
            $manifest,
            'oauth_identities',
        );

        if ($categoryCompleted) {
            return AccountDeleteCleanupCategoryExecutionResult::completed(
                'oauth_identities',
            );
        }

        return AccountDeleteCleanupCategoryExecutionResult::bookkeepingFailed(
            'oauth_identities',
        );
    }

    public function execute(
        AccountDeleteCleanupManifest $manifest,
    ): bool {
        return $this->executeWithResult($manifest)->categoryCompleted;
    }
}

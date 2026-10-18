<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\AccountDeleteCleanupManifest;

final class AccountDeleteOtherUserOwnedResourcesCleanupOrchestrator
{
    public function __construct(
        private readonly AccountDeleteOtherUserOwnedResourcesCleanupService $cleanupService,
        private readonly AccountDeleteCleanupManifestService $manifestService,
    ) {}

    public function executeWithResult(
        AccountDeleteCleanupManifest $manifest,
    ): AccountDeleteCleanupCategoryExecutionResult {
        $cleanupResult = $this->cleanupService->cleanupWithResult($manifest);

        if (! $cleanupResult->executed) {
            return AccountDeleteCleanupCategoryExecutionResult::rejected(
                'other_user_owned_resources',
            );
        }

        $categoryCompleted = $this->manifestService->markCategoryCompleted(
            $manifest,
            'other_user_owned_resources',
        );

        if ($categoryCompleted) {
            return AccountDeleteCleanupCategoryExecutionResult::completed(
                'other_user_owned_resources',
            );
        }

        return AccountDeleteCleanupCategoryExecutionResult::bookkeepingFailed(
            'other_user_owned_resources',
        );
    }

    public function execute(
        AccountDeleteCleanupManifest $manifest,
    ): bool {
        return $this->executeWithResult($manifest)->categoryCompleted;
    }
}

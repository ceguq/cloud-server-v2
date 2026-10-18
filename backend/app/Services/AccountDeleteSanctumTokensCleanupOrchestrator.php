<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\AccountDeleteCleanupManifest;

final class AccountDeleteSanctumTokensCleanupOrchestrator
{
    public function __construct(
        private readonly AccountDeleteSanctumTokensCleanupService $cleanupService,
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
                'sanctum_tokens',
            );
        }

        $categoryCompleted = $this->manifestService->markCategoryCompleted(
            $manifest,
            'sanctum_tokens',
        );

        if ($categoryCompleted) {
            return AccountDeleteCleanupCategoryExecutionResult::completed(
                'sanctum_tokens',
            );
        }

        return AccountDeleteCleanupCategoryExecutionResult::bookkeepingFailed(
            'sanctum_tokens',
        );
    }

    public function execute(
        AccountDeleteCleanupManifest $manifest,
    ): bool {
        return $this->executeWithResult($manifest)->categoryCompleted;
    }
}

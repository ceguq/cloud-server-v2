<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\AccountDeleteCleanupManifest;

final class AccountDeleteDevicesCleanupOrchestrator
{
    public function __construct(
        private readonly AccountDeleteDevicesCleanupService $cleanupService,
        private readonly AccountDeleteCleanupManifestService $manifestService,
    ) {}

    public function executeWithResult(
        AccountDeleteCleanupManifest $manifest,
    ): AccountDeleteCleanupCategoryExecutionResult {
        $cleanupResult = $this->cleanupService->cleanupWithResult($manifest);

        if (! $cleanupResult->executed) {
            return AccountDeleteCleanupCategoryExecutionResult::rejected('devices');
        }

        $categoryCompleted = $this->manifestService->markCategoryCompleted(
            $manifest,
            'devices',
        );

        if ($categoryCompleted) {
            return AccountDeleteCleanupCategoryExecutionResult::completed('devices');
        }

        return AccountDeleteCleanupCategoryExecutionResult::bookkeepingFailed('devices');
    }

    public function execute(AccountDeleteCleanupManifest $manifest): bool
    {
        return $this->executeWithResult($manifest)->categoryCompleted;
    }
}

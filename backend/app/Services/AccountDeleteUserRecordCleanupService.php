<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\AccountDeleteCleanupManifest;
use App\Models\User;

final class AccountDeleteUserRecordCleanupService
{
    public function cleanupWithResult(
        AccountDeleteCleanupManifest $manifest,
    ): AccountDeleteUserRecordCleanupResult {
        if (! $manifest->exists) {
            return AccountDeleteUserRecordCleanupResult::rejected();
        }

        $manifest = $manifest->fresh();
        if (! $manifest
            || ! is_int($manifest->subject_user_id)
            || $manifest->subject_user_id <= 0
            || $manifest->status !== 'in_progress'
            || $manifest->completed_at !== null
            || $manifest->failure_category !== null) {
            return AccountDeleteUserRecordCleanupResult::rejected();
        }

        $categoryStates = $manifest->category_states;
        if (! is_array($categoryStates)
            || array_keys($categoryStates) !== AccountDeleteCleanupManifestService::CLEANUP_CATEGORIES
            || ($categoryStates['user_record'] ?? null) !== 'pending') {
            return AccountDeleteUserRecordCleanupResult::rejected();
        }

        foreach (AccountDeleteCleanupManifestService::CLEANUP_CATEGORIES as $category) {
            if ($category !== 'user_record' && $categoryStates[$category] !== 'completed') {
                return AccountDeleteUserRecordCleanupResult::rejected();
            }
        }

        $deletedCount = User::query()
            ->whereKey($manifest->subject_user_id)
            ->delete();

        return AccountDeleteUserRecordCleanupResult::executed($deletedCount);
    }
}

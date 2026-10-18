<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\AccountDeleteCleanupManifest;
use App\Models\ActivityLog;
use Illuminate\Database\Eloquent\ModelNotFoundException;

final class AccountDeleteActivityLogsCleanupService
{
    public function cleanupWithResult(
        AccountDeleteCleanupManifest $manifest,
    ): AccountDeleteActivityLogsCleanupResult {
        if (! $manifest->exists) {
            return AccountDeleteActivityLogsCleanupResult::rejected();
        }

        try {
            $manifest = $manifest->fresh();
        } catch (ModelNotFoundException) {
            return AccountDeleteActivityLogsCleanupResult::rejected();
        }

        if (! $manifest
            || ! is_int($manifest->subject_user_id)
            || $manifest->subject_user_id <= 0
            || $manifest->status !== 'in_progress'
            || $manifest->completed_at !== null
            || $manifest->failure_category !== null
            || ($manifest->category_states['activity_logs'] ?? null) !== 'pending') {
            return AccountDeleteActivityLogsCleanupResult::rejected();
        }

        $deletedCount = ActivityLog::query()
            ->where('user_id', $manifest->subject_user_id)
            ->delete();

        return AccountDeleteActivityLogsCleanupResult::executed(
            (int) $deletedCount,
        );
    }
}

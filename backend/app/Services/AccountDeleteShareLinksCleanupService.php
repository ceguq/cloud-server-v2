<?php

namespace App\Services;

use App\Models\AccountDeleteCleanupManifest;
use App\Models\File;
use App\Models\ShareLink;

class AccountDeleteShareLinksCleanupService
{
    public function cleanupWithResult(
        AccountDeleteCleanupManifest $manifest,
    ): AccountDeleteShareLinksCleanupResult {

        if (! $manifest->exists) {
            return AccountDeleteShareLinksCleanupResult::rejected();
        }

        $manifest = $manifest->fresh();

        if (! $manifest) {
            return AccountDeleteShareLinksCleanupResult::rejected();
        }

        if (! $manifest->subject_user_id) {
            return AccountDeleteShareLinksCleanupResult::rejected();
        }

        if ($manifest->status !== 'in_progress') {
            return AccountDeleteShareLinksCleanupResult::rejected();
        }

        if ($manifest->completed_at !== null) {
            return AccountDeleteShareLinksCleanupResult::rejected();
        }

        if ($manifest->failure_category !== null) {
            return AccountDeleteShareLinksCleanupResult::rejected();
        }

        if (($manifest->category_states['share_links'] ?? null) !== 'pending') {
            return AccountDeleteShareLinksCleanupResult::rejected();
        }

        $deletedCount = ShareLink::query()
            ->whereIn(
                'file_id',
                File::withTrashed()
                    ->where('user_id', $manifest->subject_user_id)
                    ->select('id'),
            )
            ->delete();

        return AccountDeleteShareLinksCleanupResult::executed(
            (int) $deletedCount,
        );
    }

    public function cleanup(AccountDeleteCleanupManifest $manifest): int
    {
        return $this->cleanupWithResult($manifest)->deletedCount;
    }
}

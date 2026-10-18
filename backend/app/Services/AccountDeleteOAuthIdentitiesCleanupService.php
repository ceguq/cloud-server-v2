<?php

namespace App\Services;

use App\Models\AccountDeleteCleanupManifest;
use App\Models\OAuthIdentity;

final class AccountDeleteOAuthIdentitiesCleanupService
{
    public function cleanupWithResult(
        AccountDeleteCleanupManifest $manifest,
    ): AccountDeleteOAuthIdentitiesCleanupResult {
        // 1) Persisted manifest guard
        if (! $manifest->exists) {
            return AccountDeleteOAuthIdentitiesCleanupResult::rejected();
        }

        // 2) Refresh authoritative state
        $freshManifest = $manifest->fresh();
        if ($freshManifest === null) {
            return AccountDeleteOAuthIdentitiesCleanupResult::rejected();
        }

        // 3) Valid subject ownership
        $subjectUserId = $freshManifest->subject_user_id;
        if (! is_int($subjectUserId) || $subjectUserId <= 0) {
            return AccountDeleteOAuthIdentitiesCleanupResult::rejected();
        }

        // 4) Manifest status
        if (($freshManifest->status ?? null) !== 'in_progress') {
            return AccountDeleteOAuthIdentitiesCleanupResult::rejected();
        }

        // 5) completion guard
        if (($freshManifest->completed_at ?? null) !== null) {
            return AccountDeleteOAuthIdentitiesCleanupResult::rejected();
        }

        // 6) failure guard
        if (($freshManifest->failure_category ?? null) !== null) {
            return AccountDeleteOAuthIdentitiesCleanupResult::rejected();
        }

        // 7) category-state structure
        $categoryStates = $freshManifest->category_states;
        if (is_string($categoryStates)) {
            $categoryStates = json_decode($categoryStates, true);
        }

        if (! is_array($categoryStates)) {
            return AccountDeleteOAuthIdentitiesCleanupResult::rejected();
        }

        if (! array_key_exists('oauth_identities', $categoryStates)) {
            return AccountDeleteOAuthIdentitiesCleanupResult::rejected();
        }

        if ($categoryStates['oauth_identities'] !== 'pending') {
            return AccountDeleteOAuthIdentitiesCleanupResult::rejected();
        }

        // Required cleanup query
        $deletedCount = OAuthIdentity::query()
            ->where('user_id', $freshManifest->subject_user_id)
            ->delete();

        return AccountDeleteOAuthIdentitiesCleanupResult::executed($deletedCount);
    }
}

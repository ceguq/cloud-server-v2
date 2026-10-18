<?php

namespace App\Services;

use App\Models\AccountDeleteCleanupManifest;
use App\Models\User;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Laravel\Sanctum\PersonalAccessToken;

final class AccountDeleteSanctumTokensCleanupService
{
    public function cleanupWithResult(
        AccountDeleteCleanupManifest $manifest,
    ): AccountDeleteSanctumTokensCleanupResult {
        // Persisted manifest guard
        if (! $manifest->exists) {
            return AccountDeleteSanctumTokensCleanupResult::rejected();
        }

        try {
            $manifest = $manifest->fresh();
        } catch (ModelNotFoundException) {
            return AccountDeleteSanctumTokensCleanupResult::rejected();
        }

        if (! $manifest) {
            return AccountDeleteSanctumTokensCleanupResult::rejected();
        }

        if (! is_int($manifest->subject_user_id) || $manifest->subject_user_id <= 0) {
            return AccountDeleteSanctumTokensCleanupResult::rejected();
        }

        if (($manifest->status ?? null) !== 'in_progress') {
            return AccountDeleteSanctumTokensCleanupResult::rejected();
        }

        if (($manifest->completed_at ?? null) !== null) {
            return AccountDeleteSanctumTokensCleanupResult::rejected();
        }

        if (($manifest->failure_category ?? null) !== null) {
            return AccountDeleteSanctumTokensCleanupResult::rejected();
        }

        $categoryStates = $manifest->category_states;
        if (is_string($categoryStates)) {
            $categoryStates = json_decode($categoryStates, true);
        }

        if (! is_array($categoryStates)) {
            return AccountDeleteSanctumTokensCleanupResult::rejected();
        }

        if (! array_key_exists('sanctum_tokens', $categoryStates)) {
            return AccountDeleteSanctumTokensCleanupResult::rejected();
        }

        if ($categoryStates['sanctum_tokens'] !== 'pending') {
            return AccountDeleteSanctumTokensCleanupResult::rejected();
        }

        $userMorphClass = (new User)->getMorphClass();

        $deletedCount = PersonalAccessToken::query()
            ->where('tokenable_type', $userMorphClass)
            ->where('tokenable_id', (int) $manifest->subject_user_id)
            ->delete();

        return AccountDeleteSanctumTokensCleanupResult::executed(
            (int) $deletedCount,
        );
    }
}

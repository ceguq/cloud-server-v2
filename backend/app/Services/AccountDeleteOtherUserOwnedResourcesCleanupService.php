<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\AccountDeleteCleanupManifest;
use App\Models\User;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;

final class AccountDeleteOtherUserOwnedResourcesCleanupService
{
    public function cleanupWithResult(
        AccountDeleteCleanupManifest $manifest,
    ): AccountDeleteOtherUserOwnedResourcesCleanupResult {
        if (! $manifest->exists) {
            return AccountDeleteOtherUserOwnedResourcesCleanupResult::rejected();
        }

        try {
            $manifest = $manifest->fresh();
        } catch (ModelNotFoundException) {
            return AccountDeleteOtherUserOwnedResourcesCleanupResult::rejected();
        }

        if (! $manifest
            || ! is_int($manifest->subject_user_id)
            || $manifest->subject_user_id <= 0
            || $manifest->status !== 'in_progress'
            || $manifest->completed_at !== null
            || $manifest->failure_category !== null
            || ($manifest->category_states['other_user_owned_resources'] ?? null) !== 'pending') {
            return AccountDeleteOtherUserOwnedResourcesCleanupResult::rejected();
        }

        $user = User::query()->find($manifest->subject_user_id);
        if (! $user) {
            return AccountDeleteOtherUserOwnedResourcesCleanupResult::rejected();
        }

        $deletedSessions = DB::table('sessions')
            ->where('user_id', $manifest->subject_user_id)
            ->delete();

        $deletedPasswordResetTokens = DB::table('password_reset_tokens')
            ->where('email', $user->email)
            ->delete();

        return AccountDeleteOtherUserOwnedResourcesCleanupResult::executed(
            (int) ($deletedSessions + $deletedPasswordResetTokens),
        );
    }
}

<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\AccountDeleteCleanupManifest;
use App\Models\GDriveAccount;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\Log;
use Throwable;

final class AccountDeleteGoogleDriveCredentialsCleanupService
{
    public function __construct(
        private readonly GoogleDriveService $googleDriveService,
    ) {}

    public function cleanupWithResult(
        AccountDeleteCleanupManifest $manifest,
    ): AccountDeleteGoogleDriveCredentialsCleanupResult {
        if (! $manifest->exists) {
            return AccountDeleteGoogleDriveCredentialsCleanupResult::rejected();
        }

        try {
            $manifest = $manifest->fresh();
        } catch (ModelNotFoundException) {
            return AccountDeleteGoogleDriveCredentialsCleanupResult::rejected();
        }

        if (! $manifest
            || ! is_int($manifest->subject_user_id)
            || $manifest->subject_user_id <= 0
            || $manifest->status !== 'in_progress'
            || $manifest->completed_at !== null
            || $manifest->failure_category !== null
            || ($manifest->category_states['google_drive_credentials'] ?? null) !== 'pending') {
            return AccountDeleteGoogleDriveCredentialsCleanupResult::rejected();
        }

        $accounts = GDriveAccount::query()
            ->where('user_id', $manifest->subject_user_id)
            ->get();

        foreach ($accounts as $account) {
            $token = $account->refresh_token ?: $account->access_token;
            if (! is_string($token) || $token === '') {
                continue;
            }

            try {
                if (! $this->googleDriveService->revokeToken($token)) {
                    Log::warning('Google Drive token revocation failed during account deletion.', [
                        'account_id' => $account->getKey(),
                        'user_id' => $manifest->subject_user_id,
                    ]);
                }
            } catch (Throwable $exception) {
                Log::warning('Google Drive token revocation threw during account deletion.', [
                    'account_id' => $account->getKey(),
                    'user_id' => $manifest->subject_user_id,
                    'exception' => $exception::class,
                ]);
            }
        }

        $deletedCount = GDriveAccount::query()
            ->where('user_id', $manifest->subject_user_id)
            ->delete();

        return AccountDeleteGoogleDriveCredentialsCleanupResult::executed(
            (int) $deletedCount,
        );
    }
}

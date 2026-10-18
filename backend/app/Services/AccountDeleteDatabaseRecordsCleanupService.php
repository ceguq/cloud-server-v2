<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\AccountDeleteCleanupManifest;
use App\Models\File;
use App\Models\Folder;
use Illuminate\Database\Eloquent\ModelNotFoundException;

final class AccountDeleteDatabaseRecordsCleanupService
{
    public function cleanupWithResult(
        AccountDeleteCleanupManifest $manifest,
    ): AccountDeleteDatabaseRecordsCleanupResult {
        if (! $manifest->exists) {
            return AccountDeleteDatabaseRecordsCleanupResult::rejected();
        }

        try {
            $manifest = $manifest->fresh();
        } catch (ModelNotFoundException) {
            return AccountDeleteDatabaseRecordsCleanupResult::rejected();
        }

        if (! $manifest) {
            return AccountDeleteDatabaseRecordsCleanupResult::rejected();
        }

        if (! is_int($manifest->subject_user_id) || $manifest->subject_user_id <= 0) {
            return AccountDeleteDatabaseRecordsCleanupResult::rejected();
        }

        if (($manifest->status ?? null) !== 'in_progress') {
            return AccountDeleteDatabaseRecordsCleanupResult::rejected();
        }

        if (($manifest->completed_at ?? null) !== null) {
            return AccountDeleteDatabaseRecordsCleanupResult::rejected();
        }

        if (($manifest->failure_category ?? null) !== null) {
            return AccountDeleteDatabaseRecordsCleanupResult::rejected();
        }

        $categoryStates = $manifest->category_states;
        if (is_string($categoryStates)) {
            $categoryStates = json_decode($categoryStates, true);
        }

        if (! is_array($categoryStates)) {
            return AccountDeleteDatabaseRecordsCleanupResult::rejected();
        }

        if (! array_key_exists('database_records', $categoryStates)) {
            return AccountDeleteDatabaseRecordsCleanupResult::rejected();
        }

        if ($categoryStates['database_records'] !== 'pending') {
            return AccountDeleteDatabaseRecordsCleanupResult::rejected();
        }

        if (! array_key_exists('share_links', $categoryStates)) {
            return AccountDeleteDatabaseRecordsCleanupResult::rejected();
        }

        if ($categoryStates['share_links'] !== 'completed') {
            return AccountDeleteDatabaseRecordsCleanupResult::rejected();
        }

        $subjectUserId = (int) $manifest->subject_user_id;

        // Permanently delete files first (including soft-deleted records).
        $deletedFileCount = File::query()
            ->withTrashed()
            ->where('user_id', $subjectUserId)
            ->forceDelete();

        // Permanently delete folders after files (including soft-deleted records).
        $deletedFolderCount = Folder::query()
            ->withTrashed()
            ->where('user_id', $subjectUserId)
            ->forceDelete();

        $deletedCount = (int) $deletedFileCount + (int) $deletedFolderCount;

        return AccountDeleteDatabaseRecordsCleanupResult::executed($deletedCount);
    }
}

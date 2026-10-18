<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\AccountDeleteCleanupManifest;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\Storage;

final class AccountDeletePhysicalLocalFilesCleanupService
{
    public function cleanupWithResult(
        AccountDeleteCleanupManifest $manifest,
    ): AccountDeletePhysicalLocalFilesCleanupResult {
        if (! $manifest->exists) {
            return AccountDeletePhysicalLocalFilesCleanupResult::rejected();
        }

        try {
            $manifest = $manifest->fresh();
        } catch (ModelNotFoundException) {
            return AccountDeletePhysicalLocalFilesCleanupResult::rejected();
        }

        if (! $manifest) {
            return AccountDeletePhysicalLocalFilesCleanupResult::rejected();
        }

        if (! is_int($manifest->subject_user_id) || $manifest->subject_user_id <= 0) {
            return AccountDeletePhysicalLocalFilesCleanupResult::rejected();
        }

        if ($manifest->status !== 'in_progress'
            || $manifest->completed_at !== null
            || $manifest->failure_category !== null) {
            return AccountDeletePhysicalLocalFilesCleanupResult::rejected();
        }

        $categoryStates = $manifest->category_states;
        if (! is_array($categoryStates)
            || ($categoryStates['share_links'] ?? null) !== 'completed'
            || ($categoryStates['physical_local_files'] ?? null) !== 'pending'
            || ($categoryStates['database_records'] ?? null) !== 'pending') {
            return AccountDeletePhysicalLocalFilesCleanupResult::rejected();
        }

        $ownershipSnapshot = $manifest->ownership_snapshot;
        if (! is_array($ownershipSnapshot)
            || ($ownershipSnapshot['subject_user_id'] ?? null) !== $manifest->subject_user_id
            || ! is_array($ownershipSnapshot['physical_paths'] ?? null)) {
            return AccountDeletePhysicalLocalFilesCleanupResult::rejected();
        }

        $paths = $ownershipSnapshot['physical_paths'];
        foreach ($paths as $path) {
            if (! is_string($path)
                || ! str_starts_with($path, 'nimbusdrive/')
                || $path === 'nimbusdrive/'
                || $path === 'nimbusdrive/.'
                || $path === 'nimbusdrive/..'
                || str_contains(substr($path, strlen('nimbusdrive/')), '/')
                || str_contains(substr($path, strlen('nimbusdrive/')), '\\')) {
                return AccountDeletePhysicalLocalFilesCleanupResult::rejected();
            }
        }

        $disk = Storage::disk('local');
        $deletedCount = 0;

        foreach (array_unique($paths) as $path) {
            if (! $disk->exists($path)) {
                continue;
            }

            if (! $disk->delete($path)) {
                return AccountDeletePhysicalLocalFilesCleanupResult::rejected($deletedCount);
            }

            $deletedCount++;
        }

        return AccountDeletePhysicalLocalFilesCleanupResult::executed($deletedCount);
    }
}

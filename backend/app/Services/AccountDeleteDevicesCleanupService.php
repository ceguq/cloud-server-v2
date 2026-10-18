<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\AccountDeleteCleanupManifest;
use App\Models\Device;
use Illuminate\Database\Eloquent\ModelNotFoundException;

final class AccountDeleteDevicesCleanupService
{
    public function cleanupWithResult(
        AccountDeleteCleanupManifest $manifest,
    ): AccountDeleteDevicesCleanupResult {
        if (! $manifest->exists) {
            return AccountDeleteDevicesCleanupResult::rejected();
        }

        try {
            $manifest = $manifest->fresh();
        } catch (ModelNotFoundException) {
            return AccountDeleteDevicesCleanupResult::rejected();
        }

        if (! $manifest
            || ! is_int($manifest->subject_user_id)
            || $manifest->subject_user_id <= 0
            || $manifest->status !== 'in_progress'
            || $manifest->completed_at !== null
            || $manifest->failure_category !== null) {
            return AccountDeleteDevicesCleanupResult::rejected();
        }

        $categoryStates = $manifest->category_states;
        if (! is_array($categoryStates)
            || ($categoryStates['database_records'] ?? null) !== 'completed'
            || ($categoryStates['devices'] ?? null) !== 'pending') {
            return AccountDeleteDevicesCleanupResult::rejected();
        }

        $deletedCount = Device::query()
            ->where('user_id', $manifest->subject_user_id)
            ->delete();

        return AccountDeleteDevicesCleanupResult::executed((int) $deletedCount);
    }
}

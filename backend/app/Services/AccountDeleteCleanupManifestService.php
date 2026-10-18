<?php

namespace App\Services;

use App\Models\AccountDeleteCleanupManifest;
use App\Models\File;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AccountDeleteCleanupManifestService
{
    public const CLEANUP_CATEGORIES = [
        'database_records',
        'physical_local_files',
        'share_links',
        'devices',
        'oauth_identities',
        'sanctum_tokens',
        'google_drive_credentials',
        'activity_logs',
        'other_user_owned_resources',
        'user_record',
    ];

    /**
     * @return array<int, string>
     */
    public function collectPhysicalPaths(User $user): array
    {
        return File::withTrashed()
            ->where('user_id', $user->getKey())
            ->pluck('path')
            ->unique()
            ->values()
            ->all();

    }

    public function createForUser(User $user): AccountDeleteCleanupManifest
    {
        $physicalPaths = $this->collectPhysicalPaths($user);

        return AccountDeleteCleanupManifest::create([
            'operation_id' => Str::random(64),
            'subject_user_id' => $user->getKey(),
            'status' => 'pending',
            'ownership_snapshot' => [
                'subject_user_id' => $user->getKey(),
                'physical_paths' => $physicalPaths,
            ],
            'category_states' => array_fill_keys(
                self::CLEANUP_CATEGORIES,
                'pending',
            ),
            'attempt_count' => 0,
            'last_attempt_at' => null,
            'completed_at' => null,
            'failure_category' => null,
        ]);
    }

    public function resolveOrCreateForUser(User $user): AccountDeleteCleanupManifest
    {
        return DB::transaction(function () use ($user): AccountDeleteCleanupManifest {
            $lockedUser = User::query()
                ->whereKey($user->getKey())
                ->lockForUpdate()
                ->firstOrFail();

            $activeManifest = AccountDeleteCleanupManifest::query()
                ->where('subject_user_id', $lockedUser->getKey())
                ->whereIn('status', ['pending', 'in_progress', 'cleanup_pending'])
                ->orderByDesc('id')
                ->lockForUpdate()
                ->first();

            return $activeManifest ?? $this->createForUser($lockedUser);
        });
    }

    public function beginAttempt(AccountDeleteCleanupManifest $manifest): bool
    {
        if (! $manifest->exists) {
            return false;
        }

        if (! $manifest->getKey()) {
            return false;
        }

        if ($manifest->status !== 'pending') {
            return false;
        }

        if ((int) $manifest->attempt_count !== 0) {
            return false;
        }

        if (! is_null($manifest->completed_at)) {
            return false;
        }

        $now = now('UTC');

        $updated = AccountDeleteCleanupManifest::query()
            ->whereKey($manifest->getKey())
            ->where('status', 'pending')
            ->where('attempt_count', 0)
            ->whereNull('completed_at')
            ->update([
                'status' => 'in_progress',
                'attempt_count' => 1,
                'last_attempt_at' => $now,
                'updated_at' => $now,
            ]);

        return $updated === 1;
    }

    public function markCategoryCompleted(
        AccountDeleteCleanupManifest $manifest,
        string $category,
    ): bool {
        if (! in_array($category, self::CLEANUP_CATEGORIES, true)) {
            return false;
        }

        if (! $manifest->exists) {
            return false;
        }

        if (! $manifest->getKey()) {
            return false;
        }

        return DB::transaction(function () use ($manifest, $category): bool {
            $stored = AccountDeleteCleanupManifest::query()
                ->whereKey($manifest->getKey())
                ->lockForUpdate()
                ->first();

            if (! $stored) {
                return false;
            }

            if ($stored->status !== 'in_progress') {
                return false;
            }

            if (! is_null($stored->completed_at)) {
                return false;
            }

            $categoryStates = $stored->category_states;
            if (! is_array($categoryStates)) {
                return false;
            }

            if (! array_key_exists($category, $categoryStates)) {
                return false;
            }

            if ($categoryStates[$category] !== 'pending') {
                return false;
            }

            $categoryStates[$category] = 'completed';
            $stored->category_states = $categoryStates;

            return (bool) $stored->save();
        });
    }

    public function completeIfAllCategoriesCompleted(AccountDeleteCleanupManifest $manifest): bool
    {
        if (! $manifest->exists) {
            return false;
        }

        if (! $manifest->getKey()) {
            return false;
        }

        return DB::transaction(function () use ($manifest): bool {
            $stored = AccountDeleteCleanupManifest::query()
                ->whereKey($manifest->getKey())
                ->lockForUpdate()
                ->first();

            if (! $stored) {
                return false;
            }

            if ($stored->status !== 'in_progress') {
                return false;
            }

            if (! is_null($stored->completed_at)) {
                return false;
            }

            if (! is_null($stored->failure_category)) {
                return false;
            }

            $categoryStates = $stored->category_states;
            if (! is_array($categoryStates)) {
                return false;
            }

            if (array_keys($categoryStates) !== self::CLEANUP_CATEGORIES) {
                return false;
            }

            foreach (self::CLEANUP_CATEGORIES as $category) {
                if ($categoryStates[$category] !== 'completed') {
                    return false;
                }
            }

            $stored->status = 'completed';
            $stored->completed_at = now('UTC');

            return (bool) $stored->save();
        });
    }

    public function markCategoryFailed(
        AccountDeleteCleanupManifest $manifest,
        string $category,
    ): bool {
        if (! in_array($category, self::CLEANUP_CATEGORIES, true)) {
            return false;
        }

        if (! $manifest->exists) {
            return false;
        }

        if (! $manifest->getKey()) {
            return false;
        }

        return DB::transaction(function () use ($manifest, $category): bool {
            $storedManifest = AccountDeleteCleanupManifest::query()
                ->whereKey($manifest->getKey())
                ->lockForUpdate()
                ->first();

            if (! $storedManifest) {
                return false;
            }

            if ($storedManifest->status !== 'in_progress') {
                return false;
            }

            if (! is_null($storedManifest->completed_at)) {
                return false;
            }

            if (! is_null($storedManifest->failure_category)) {
                return false;
            }

            $categoryStates = $storedManifest->category_states;
            if (! is_array($categoryStates)) {
                return false;
            }

            if (! array_key_exists($category, $categoryStates)) {
                return false;
            }

            if ($categoryStates[$category] !== 'pending') {
                return false;
            }

            $categoryStates[$category] = 'failed';

            $storedManifest->category_states = $categoryStates;
            $storedManifest->status = 'cleanup_pending';
            $storedManifest->failure_category = $category;

            return (bool) $storedManifest->save();
        });
    }

    public function beginRetryAttempt(
        AccountDeleteCleanupManifest $manifest,
    ): bool {
        if (! $manifest->exists) {
            return false;
        }

        if (! $manifest->getKey()) {
            return false;
        }

        return DB::transaction(function () use ($manifest): bool {
            $storedManifest = AccountDeleteCleanupManifest::query()
                ->whereKey($manifest->getKey())
                ->lockForUpdate()
                ->first();

            if (! $storedManifest) {
                return false;
            }

            if ($storedManifest->status !== 'cleanup_pending') {
                return false;
            }

            if (! is_null($storedManifest->completed_at)) {
                return false;
            }

            $failureCategory = $storedManifest->failure_category;
            if (! is_string($failureCategory) || $failureCategory === '') {
                return false;
            }

            if (! in_array($failureCategory, self::CLEANUP_CATEGORIES, true)) {
                return false;
            }

            $categoryStates = $storedManifest->category_states;
            if (! is_array($categoryStates)) {
                return false;
            }

            if (array_keys($categoryStates) !== self::CLEANUP_CATEGORIES) {
                return false;
            }

            if (! array_key_exists($failureCategory, $categoryStates)) {
                return false;
            }

            if ($categoryStates[$failureCategory] !== 'failed') {
                return false;
            }

            if ((int) $storedManifest->attempt_count < 1) {
                return false;
            }

            $categoryStates[$failureCategory] = 'pending';

            $storedManifest->category_states = $categoryStates;
            $storedManifest->status = 'in_progress';
            $storedManifest->failure_category = null;
            $storedManifest->attempt_count = ((int) $storedManifest->attempt_count) + 1;
            $storedManifest->last_attempt_at = now('UTC');

            return (bool) $storedManifest->save();
        });
    }
}

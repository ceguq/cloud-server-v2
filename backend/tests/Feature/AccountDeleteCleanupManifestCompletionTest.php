<?php

namespace Tests\Feature;

use App\Models\AccountDeleteCleanupManifest;
use App\Models\File;
use App\Models\User;
use App\Services\AccountDeleteCleanupManifestService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AccountDeleteCleanupManifestCompletionTest extends TestCase
{
    use RefreshDatabase;

    public function test_account_delete_cleanup_manifest_can_complete_after_all_categories_are_completed(): void
    {
        $user = User::factory()->create();

        $file = File::create([
            'user_id' => $user->id,
            'folder_id' => null,
            'original_name' => 'all-categories-completed-file.bin',
            'stored_name' => 'all-categories-completed-file.bin',
            'path' => 'nimbusdrive/all-categories-completed-file.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 100,
        ]);

        /** @var AccountDeleteCleanupManifestService $service */
        $service = app(AccountDeleteCleanupManifestService::class);

        $manifest = $service->createForUser($user);

        $started = $service->beginAttempt($manifest);
        $this->assertTrue($started);

        $inProgressManifest = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($inProgressManifest);

        $this->assertSame('in_progress', $inProgressManifest->status);
        $this->assertSame(1, $inProgressManifest->attempt_count);
        $this->assertNull($inProgressManifest->completed_at);
        $this->assertNull($inProgressManifest->failure_category);

        $categories = [
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

        $this->assertIsArray($inProgressManifest->category_states);
        $this->assertSame($categories, array_keys($inProgressManifest->category_states));
        foreach ($categories as $category) {
            $this->assertSame('pending', $inProgressManifest->category_states[$category]);
        }

        foreach ($categories as $category) {
            $categoryCompleted = $service->markCategoryCompleted(
                $inProgressManifest,
                $category,
            );

            $this->assertTrue($categoryCompleted);
        }

        $allCategoriesCompletedManifest = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($allCategoriesCompletedManifest);

        $this->assertSame('in_progress', $allCategoriesCompletedManifest->status);
        $this->assertSame(1, $allCategoriesCompletedManifest->attempt_count);
        $this->assertNull($allCategoriesCompletedManifest->completed_at);
        $this->assertNull($allCategoriesCompletedManifest->failure_category);

        $this->assertIsArray($allCategoriesCompletedManifest->category_states);
        $this->assertSame($categories, array_keys($allCategoriesCompletedManifest->category_states));
        foreach ($categories as $category) {
            $this->assertSame('completed', $allCategoriesCompletedManifest->category_states[$category]);
        }

        $beforeCategoryStates = $allCategoriesCompletedManifest->category_states;
        $beforeOperationId = $allCategoriesCompletedManifest->operation_id;
        $beforeSubjectUserId = $allCategoriesCompletedManifest->subject_user_id;
        $beforeOwnershipSnapshot = $allCategoriesCompletedManifest->ownership_snapshot;
        $beforeAttemptCount = $allCategoriesCompletedManifest->attempt_count;
        $beforeLastAttemptAt = $allCategoriesCompletedManifest->last_attempt_at;
        $beforeFailureCategory = $allCategoriesCompletedManifest->failure_category;

        $this->assertNotNull($beforeLastAttemptAt);

        // Expected red result: method is not yet implemented.
        $allCategoriesCompletedManifest = $allCategoriesCompletedManifest;
        $completed = $service->completeIfAllCategoriesCompleted(
            $allCategoriesCompletedManifest,
        );
        $this->assertTrue($completed);

        $after = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($after);

        $this->assertSame('completed', $after->status);
        $this->assertSame(1, $after->attempt_count);
        $this->assertNotNull($after->completed_at);
        $this->assertNull($after->failure_category);

        $this->assertIsArray($after->category_states);
        $this->assertSame($categories, array_keys($after->category_states));
        foreach ($categories as $category) {
            $this->assertSame('completed', $after->category_states[$category]);
        }

        foreach ($categories as $category) {
            $this->assertSame('completed', $after->category_states[$category]);
        }

        $this->assertTrue(
            $beforeLastAttemptAt->equalTo($after->last_attempt_at)
        );

        $this->assertIsArray($after->ownership_snapshot);
        $this->assertContains(
            'nimbusdrive/all-categories-completed-file.bin',
            (array) $after->ownership_snapshot['physical_paths'],
        );

        $this->assertSame($beforeOperationId, $after->operation_id);
        $this->assertSame($beforeSubjectUserId, $after->subject_user_id);
        $this->assertSame($beforeOwnershipSnapshot, $after->ownership_snapshot);
        $this->assertSame($beforeAttemptCount, $after->attempt_count);
        $this->assertSame($beforeFailureCategory, $after->failure_category);
        $this->assertSame($beforeCategoryStates, $after->category_states);

        $this->assertNotNull(User::query()->find($user->id));
        $this->assertNotNull(File::query()->find($file->id));

        $reloadedFile = File::query()->find($file->id);
        $this->assertNotNull($reloadedFile);
        $this->assertSame($user->id, $reloadedFile->user_id);
        $this->assertSame('nimbusdrive/all-categories-completed-file.bin', $reloadedFile->path);
    }

    public function test_account_delete_cleanup_manifest_rejects_completion_when_one_category_is_still_pending(): void
    {
        $user = User::factory()->create();

        $file = File::create([
            'user_id' => $user->id,
            'folder_id' => null,
            'original_name' => 'one-category-pending-completion-file.bin',
            'stored_name' => 'one-category-pending-completion-file.bin',
            'path' => 'nimbusdrive/one-category-pending-completion-file.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 101,
        ]);

        /** @var AccountDeleteCleanupManifestService $service */
        $service = app(AccountDeleteCleanupManifestService::class);

        $manifest = $service->createForUser($user);

        $started = $service->beginAttempt($manifest);
        $this->assertTrue($started);

        $inProgressManifest = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($inProgressManifest);

        $this->assertSame('in_progress', $inProgressManifest->status);
        $this->assertSame(1, $inProgressManifest->attempt_count);
        $this->assertNull($inProgressManifest->completed_at);
        $this->assertNull($inProgressManifest->failure_category);

        $categories = [
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

        $this->assertIsArray($inProgressManifest->category_states);
        $this->assertSame($categories, array_keys($inProgressManifest->category_states));
        foreach ($categories as $category) {
            $this->assertSame('pending', $inProgressManifest->category_states[$category]);
        }

        $categoriesToComplete = [
            'database_records',
            'physical_local_files',
            'share_links',
            'devices',
            'oauth_identities',
            'sanctum_tokens',
            'google_drive_credentials',
            'activity_logs',
            'user_record',
        ];

        foreach ($categoriesToComplete as $category) {
            $categoryCompleted = $service->markCategoryCompleted(
                $inProgressManifest,
                $category,
            );

            $this->assertTrue($categoryCompleted);
        }

        $oneCategoryPendingManifest = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($oneCategoryPendingManifest);

        $this->assertSame('in_progress', $oneCategoryPendingManifest->status);
        $this->assertSame(1, $oneCategoryPendingManifest->attempt_count);
        $this->assertNull($oneCategoryPendingManifest->completed_at);
        $this->assertNull($oneCategoryPendingManifest->failure_category);

        $this->assertSame(10, count($oneCategoryPendingManifest->category_states));
        foreach ($categoriesToComplete as $completedCategory) {
            $this->assertSame('completed', $oneCategoryPendingManifest->category_states[$completedCategory]);
        }
        $this->assertSame('pending', $oneCategoryPendingManifest->category_states['other_user_owned_resources']);

        $beforeCategoryStates = $oneCategoryPendingManifest->category_states;
        $beforeOperationId = $oneCategoryPendingManifest->operation_id;
        $beforeSubjectUserId = $oneCategoryPendingManifest->subject_user_id;
        $beforeOwnershipSnapshot = $oneCategoryPendingManifest->ownership_snapshot;
        $beforeStatus = $oneCategoryPendingManifest->status;
        $beforeAttemptCount = $oneCategoryPendingManifest->attempt_count;
        $beforeLastAttemptAt = $oneCategoryPendingManifest->last_attempt_at;
        $beforeUpdatedAt = $oneCategoryPendingManifest->updated_at;
        $beforeCompletedAt = $oneCategoryPendingManifest->completed_at;
        $beforeFailureCategory = $oneCategoryPendingManifest->failure_category;

        $this->assertNotNull($beforeLastAttemptAt);
        $this->assertNotNull($beforeUpdatedAt);

        $this->assertFalse(
            $beforeOwnershipSnapshot['physical_paths'] === null
                || ! in_array(
                    'nimbusdrive/one-category-pending-completion-file.bin',
                    (array) $beforeOwnershipSnapshot['physical_paths'],
                    true,
                )
        );

        $completed = $service->completeIfAllCategoriesCompleted(
            $oneCategoryPendingManifest,
        );
        $this->assertFalse($completed);

        $after = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($after);

        $this->assertSame('in_progress', $after->status);
        $this->assertSame(1, $after->attempt_count);
        $this->assertNull($after->completed_at);
        $this->assertNull($after->failure_category);
        $this->assertSame('pending', $after->category_states['other_user_owned_resources']);

        foreach ($categoriesToComplete as $completedCategory) {
            $this->assertSame('completed', $after->category_states[$completedCategory]);
        }

        $this->assertSame($beforeCategoryStates, $after->category_states);

        $this->assertTrue(
            $beforeLastAttemptAt->equalTo($after->last_attempt_at)
        );

        $this->assertTrue(
            $beforeUpdatedAt->equalTo($after->updated_at)
        );

        $this->assertNull($after->completed_at);
        $this->assertSame($beforeFailureCategory, $after->failure_category);

        $this->assertSame($beforeOperationId, $after->operation_id);
        $this->assertSame($beforeSubjectUserId, $after->subject_user_id);
        $this->assertSame($beforeOwnershipSnapshot, $after->ownership_snapshot);

        $this->assertIsArray($after->ownership_snapshot);
        $this->assertContains(
            'nimbusdrive/one-category-pending-completion-file.bin',
            (array) $after->ownership_snapshot['physical_paths'],
        );

        $this->assertNotNull(User::query()->find($user->id));
        $this->assertNotNull(File::query()->find($file->id));

        $reloadedFile = File::query()->find($file->id);
        $this->assertNotNull($reloadedFile);
        $this->assertSame($user->id, $reloadedFile->user_id);
        $this->assertSame('nimbusdrive/one-category-pending-completion-file.bin', $reloadedFile->path);
    }

    public function test_account_delete_cleanup_manifest_rejects_completion_when_failure_category_is_set(): void
    {
        $user = User::factory()->create();

        $file = File::create([
            'user_id' => $user->id,
            'folder_id' => null,
            'original_name' => 'failure-category-completion-file.bin',
            'stored_name' => 'failure-category-completion-file.bin',
            'path' => 'nimbusdrive/failure-category-completion-file.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 202,
        ]);

        /** @var AccountDeleteCleanupManifestService $service */
        $service = app(AccountDeleteCleanupManifestService::class);

        $manifest = $service->createForUser($user);

        $started = $service->beginAttempt($manifest);
        $this->assertTrue($started);

        $inProgressManifest = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($inProgressManifest);

        $this->assertSame('in_progress', $inProgressManifest->status);
        $this->assertSame(1, $inProgressManifest->attempt_count);
        $this->assertNull($inProgressManifest->completed_at);
        $this->assertNull($inProgressManifest->failure_category);

        $categories = [
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

        foreach ($categories as $category) {
            $categoryCompleted = $service->markCategoryCompleted(
                $inProgressManifest,
                $category,
            );

            $this->assertTrue($categoryCompleted);
        }

        $allCategoriesCompletedManifest = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($allCategoriesCompletedManifest);

        $this->assertSame('in_progress', $allCategoriesCompletedManifest->status);
        $this->assertSame(1, $allCategoriesCompletedManifest->attempt_count);
        $this->assertNull($allCategoriesCompletedManifest->completed_at);
        $this->assertNull($allCategoriesCompletedManifest->failure_category);

        foreach ($categories as $category) {
            $this->assertSame('completed', $allCategoriesCompletedManifest->category_states[$category]);
        }

        $allCategoriesCompletedManifest->failure_category = 'physical_local_files';
        $allCategoriesCompletedManifest->save();

        $failedManifest = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($failedManifest);

        $this->assertSame('in_progress', $failedManifest->status);
        $this->assertSame(1, $failedManifest->attempt_count);
        $this->assertNull($failedManifest->completed_at);
        $this->assertSame('physical_local_files', $failedManifest->failure_category);

        foreach ($categories as $category) {
            $this->assertSame('completed', $failedManifest->category_states[$category]);
        }

        $beforeCategoryStates = $failedManifest->category_states;
        $beforeOperationId = $failedManifest->operation_id;
        $beforeSubjectUserId = $failedManifest->subject_user_id;
        $beforeOwnershipSnapshot = $failedManifest->ownership_snapshot;
        $beforeLastAttemptAt = $failedManifest->last_attempt_at;
        $beforeUpdatedAt = $failedManifest->updated_at;
        $beforeCompletedAt = $failedManifest->completed_at;
        $beforeFailureCategory = $failedManifest->failure_category;

        $this->assertNotNull($beforeLastAttemptAt);
        $this->assertNotNull($beforeUpdatedAt);

        $completed = $service->completeIfAllCategoriesCompleted($failedManifest);
        $this->assertFalse($completed);

        $after = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($after);

        $this->assertSame('in_progress', $after->status);
        $this->assertSame(1, $after->attempt_count);
        $this->assertNull($after->completed_at);
        $this->assertSame('physical_local_files', $after->failure_category);

        foreach ($categories as $category) {
            $this->assertSame('completed', $after->category_states[$category]);
        }

        $this->assertSame($beforeCategoryStates, $after->category_states);

        $this->assertTrue($beforeLastAttemptAt->equalTo($after->last_attempt_at));
        $this->assertTrue($beforeUpdatedAt->equalTo($after->updated_at));
        $this->assertNull($after->completed_at);
        $this->assertSame($beforeCompletedAt, $after->completed_at);
        $this->assertSame($beforeFailureCategory, $after->failure_category);

        $this->assertSame($beforeOperationId, $after->operation_id);
        $this->assertSame($beforeSubjectUserId, $after->subject_user_id);
        $this->assertSame($beforeOwnershipSnapshot, $after->ownership_snapshot);

        $this->assertIsArray($after->ownership_snapshot);
        $this->assertContains(
            'nimbusdrive/failure-category-completion-file.bin',
            (array) $after->ownership_snapshot['physical_paths'],
        );

        $this->assertNotNull(User::query()->find($user->id));
        $this->assertNotNull(File::query()->find($file->id));

        $reloadedFile = File::query()->find($file->id);
        $this->assertNotNull($reloadedFile);
        $this->assertSame($user->id, $reloadedFile->user_id);
        $this->assertSame('nimbusdrive/failure-category-completion-file.bin', $reloadedFile->path);
    }

    public function test_account_delete_cleanup_manifest_rejects_completing_an_already_completed_manifest(): void
    {
        $user = User::factory()->create();

        $file = File::create([
            'user_id' => $user->id,
            'folder_id' => null,
            'original_name' => 'replayed-overall-completion-file.bin',
            'stored_name' => 'replayed-overall-completion-file.bin',
            'path' => 'nimbusdrive/replayed-overall-completion-file.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 404,
        ]);

        /** @var AccountDeleteCleanupManifestService $service */
        $service = app(AccountDeleteCleanupManifestService::class);

        $manifest = $service->createForUser($user);

        $started = $service->beginAttempt($manifest);
        $this->assertTrue($started);

        $inProgressManifest = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($inProgressManifest);

        $categories = [
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

        foreach ($categories as $category) {
            $categoryCompleted = $service->markCategoryCompleted(
                $inProgressManifest,
                $category,
            );

            $this->assertTrue($categoryCompleted);
        }

        $allCategoriesCompletedManifest = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($allCategoriesCompletedManifest);

        $this->assertSame('in_progress', $allCategoriesCompletedManifest->status);
        $this->assertSame(1, $allCategoriesCompletedManifest->attempt_count);
        $this->assertNull($allCategoriesCompletedManifest->completed_at);
        $this->assertNull($allCategoriesCompletedManifest->failure_category);

        foreach ($categories as $category) {
            $this->assertSame('completed', $allCategoriesCompletedManifest->category_states[$category]);
        }

        $firstCompleted = $service->completeIfAllCategoriesCompleted(
            $allCategoriesCompletedManifest,
        );
        $this->assertTrue($firstCompleted);

        $completedManifest = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($completedManifest);

        $this->assertSame('completed', $completedManifest->status);
        $this->assertSame(1, $completedManifest->attempt_count);
        $this->assertNotNull($completedManifest->completed_at);
        $this->assertNull($completedManifest->failure_category);

        foreach ($categories as $category) {
            $this->assertSame('completed', $completedManifest->category_states[$category]);
        }

        $beforeCategoryStates = $completedManifest->category_states;
        $beforeOperationId = $completedManifest->operation_id;
        $beforeSubjectUserId = $completedManifest->subject_user_id;
        $beforeOwnershipSnapshot = $completedManifest->ownership_snapshot;
        $beforeLastAttemptAt = $completedManifest->last_attempt_at;
        $beforeUpdatedAt = $completedManifest->updated_at;
        $beforeCompletedAt = $completedManifest->completed_at;
        $beforeFailureCategory = $completedManifest->failure_category;

        $this->assertNotNull($beforeLastAttemptAt);
        $this->assertNotNull($beforeUpdatedAt);
        $this->assertNotNull($beforeCompletedAt);

        $secondCompleted = $service->completeIfAllCategoriesCompleted(
            $completedManifest,
        );
        $this->assertFalse($secondCompleted);

        $after = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($after);

        $this->assertSame('completed', $after->status);
        $this->assertSame(1, $after->attempt_count);
        $this->assertNotNull($after->completed_at);
        $this->assertNull($after->failure_category);

        foreach ($categories as $category) {
            $this->assertSame('completed', $after->category_states[$category]);
        }

        $this->assertSame($beforeCategoryStates, $after->category_states);

        $this->assertTrue($beforeLastAttemptAt->equalTo($after->last_attempt_at));
        $this->assertTrue($beforeUpdatedAt->equalTo($after->updated_at));
        $this->assertTrue($beforeCompletedAt->equalTo($after->completed_at));

        $this->assertSame($beforeFailureCategory, $after->failure_category);

        $this->assertSame($beforeOperationId, $after->operation_id);
        $this->assertSame($beforeSubjectUserId, $after->subject_user_id);
        $this->assertSame($beforeOwnershipSnapshot, $after->ownership_snapshot);

        $this->assertIsArray($after->ownership_snapshot);
        $this->assertContains(
            'nimbusdrive/replayed-overall-completion-file.bin',
            (array) $after->ownership_snapshot['physical_paths'],
        );

        $this->assertNotNull(User::query()->find($user->id));
        $this->assertNotNull(File::query()->find($file->id));

        $reloadedFile = File::query()->find($file->id);
        $this->assertNotNull($reloadedFile);
        $this->assertSame($user->id, $reloadedFile->user_id);
        $this->assertSame('nimbusdrive/replayed-overall-completion-file.bin', $reloadedFile->path);
    }

    public function test_account_delete_cleanup_manifest_rejects_completion_when_an_authorized_category_key_is_missing(): void
    {
        $user = User::factory()->create();

        $file = File::create([
            'user_id' => $user->id,
            'folder_id' => null,
            'original_name' => 'missing-completion-category-key-file.bin',
            'stored_name' => 'missing-completion-category-key-file.bin',
            'path' => 'nimbusdrive/missing-completion-category-key-file.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 123,
        ]);

        /** @var AccountDeleteCleanupManifestService $service */
        $service = app(AccountDeleteCleanupManifestService::class);

        $manifest = $service->createForUser($user);

        $started = $service->beginAttempt($manifest);
        $this->assertTrue($started);

        $inProgressManifest = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($inProgressManifest);

        $categories = [
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

        foreach ($categories as $category) {
            $categoryCompleted = $service->markCategoryCompleted(
                $inProgressManifest,
                $category,
            );

            $this->assertTrue($categoryCompleted);
        }

        $allCategoriesCompletedManifest = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($allCategoriesCompletedManifest);

        $this->assertSame('in_progress', $allCategoriesCompletedManifest->status);
        $this->assertSame(1, $allCategoriesCompletedManifest->attempt_count);
        $this->assertNull($allCategoriesCompletedManifest->completed_at);
        $this->assertNull($allCategoriesCompletedManifest->failure_category);
        $this->assertIsArray($allCategoriesCompletedManifest->category_states);
        $this->assertSame(10, count($allCategoriesCompletedManifest->category_states));

        foreach ($categories as $category) {
            $this->assertSame('completed', $allCategoriesCompletedManifest->category_states[$category]);
        }

        // Intentional persisted-state corruption: remove one required key.
        $corruptedCategoryStates = $allCategoriesCompletedManifest->category_states;
        unset($corruptedCategoryStates['share_links']);

        $allCategoriesCompletedManifest->category_states = $corruptedCategoryStates;
        $allCategoriesCompletedManifest->save();

        $corruptedManifest = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($corruptedManifest);

        $this->assertSame('in_progress', $corruptedManifest->status);
        $this->assertSame(1, $corruptedManifest->attempt_count);
        $this->assertNull($corruptedManifest->completed_at);
        $this->assertNull($corruptedManifest->failure_category);
        $this->assertArrayNotHasKey('share_links', $corruptedManifest->category_states);
        $this->assertSame(9, count($corruptedManifest->category_states));

        $beforeCategoryStates = $corruptedManifest->category_states;
        $beforeOperationId = $corruptedManifest->operation_id;
        $beforeSubjectUserId = $corruptedManifest->subject_user_id;
        $beforeOwnershipSnapshot = $corruptedManifest->ownership_snapshot;
        $beforeLastAttemptAt = $corruptedManifest->last_attempt_at;
        $beforeUpdatedAt = $corruptedManifest->updated_at;
        $beforeCompletedAt = $corruptedManifest->completed_at;
        $beforeFailureCategory = $corruptedManifest->failure_category;

        $this->assertNotNull($beforeLastAttemptAt);
        $this->assertNotNull($beforeUpdatedAt);

        $completed = $service->completeIfAllCategoriesCompleted($corruptedManifest);
        $this->assertFalse($completed);

        $after = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($after);

        $this->assertSame('in_progress', $after->status);
        $this->assertSame(1, $after->attempt_count);
        $this->assertNull($after->completed_at);
        $this->assertNull($after->failure_category);
        $this->assertArrayNotHasKey('share_links', $after->category_states);

        $this->assertSame($beforeCategoryStates, $after->category_states);

        foreach (array_keys($beforeCategoryStates) as $category) {
            $this->assertSame('completed', $after->category_states[$category]);
        }

        $this->assertTrue(
            $beforeLastAttemptAt->equalTo($after->last_attempt_at)
        );

        $this->assertTrue(
            $beforeUpdatedAt->equalTo($after->updated_at)
        );

        $this->assertNull($after->completed_at);
        $this->assertSame($beforeFailureCategory, $after->failure_category);

        $this->assertSame($beforeOperationId, $after->operation_id);
        $this->assertSame($beforeSubjectUserId, $after->subject_user_id);
        $this->assertSame($beforeOwnershipSnapshot, $after->ownership_snapshot);

        $this->assertIsArray($after->ownership_snapshot);
        $this->assertContains(
            'nimbusdrive/missing-completion-category-key-file.bin',
            (array) $after->ownership_snapshot['physical_paths'],
        );

        // Bookkeeping-only resource assertions.
        $this->assertNotNull(User::query()->find($user->id));
        $this->assertNotNull(File::query()->find($file->id));

        $reloadedFile = File::query()->find($file->id);
        $this->assertNotNull($reloadedFile);
        $this->assertSame($user->id, $reloadedFile->user_id);
        $this->assertSame('nimbusdrive/missing-completion-category-key-file.bin', $reloadedFile->path);
    }
}

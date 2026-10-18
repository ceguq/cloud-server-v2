<?php

namespace Tests\Feature;

use App\Models\AccountDeleteCleanupManifest;
use App\Models\File;
use App\Models\User;
use App\Services\AccountDeleteCleanupManifestService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AccountDeleteCleanupManifestCategoryProgressTest extends TestCase
{
    use RefreshDatabase;

    public function test_account_delete_cleanup_manifest_can_mark_one_pending_category_completed(): void
    {

        $user = User::factory()->create();

        $file = File::create([
            'user_id' => $user->id,
            'folder_id' => null,
            'original_name' => 'category-progress-file.bin',
            'stored_name' => 'category-progress-file.bin',
            'path' => 'nimbusdrive/category-progress-file.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 444,
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

        $operationId = $inProgressManifest->operation_id;
        $subjectUserId = $inProgressManifest->subject_user_id;
        $ownershipSnapshot = $inProgressManifest->ownership_snapshot;
        $categoryStates = $inProgressManifest->category_states;
        $beforeLastAttemptAt = $inProgressManifest->last_attempt_at;
        $beforeCompletedAt = $inProgressManifest->completed_at;
        $beforeFailureCategory = $inProgressManifest->failure_category;

        $this->assertIsArray($categoryStates);
        $this->assertCount(10, $categoryStates);

        foreach ($categoryStates as $key => $value) {
            $this->assertSame('pending', $value, "Category '{$key}' must start as pending");
        }

        $completed = $service->markCategoryCompleted(
            $inProgressManifest,
            'physical_local_files',
        );

        $this->assertTrue($completed);

        $reloaded = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($reloaded);

        $this->assertSame('in_progress', $reloaded->status);
        $this->assertSame(1, $reloaded->attempt_count);
        $this->assertNull($reloaded->completed_at);
        $this->assertNull($reloaded->failure_category);

        $this->assertTrue(
            $beforeLastAttemptAt->equalTo($reloaded->last_attempt_at)
        );

        $this->assertSame($operationId, $reloaded->operation_id);
        $this->assertSame($subjectUserId, $reloaded->subject_user_id);
        $this->assertSame($ownershipSnapshot, $reloaded->ownership_snapshot);

        $this->assertArrayHasKey('physical_local_files', $reloaded->category_states);
        $this->assertSame('completed', $reloaded->category_states['physical_local_files']);

        // Assert exact category keyset size (10) and only one category changed.
        $this->assertCount(10, $reloaded->category_states);

        $expectedCategoryStates = $categoryStates;
        $expectedCategoryStates['physical_local_files'] = 'completed';
        $this->assertSame($expectedCategoryStates, $reloaded->category_states);

        $this->assertContains(
            'nimbusdrive/category-progress-file.bin',
            (array) $reloaded->ownership_snapshot['physical_paths'],
        );

        // Read-only resource guarantee: user + file metadata remain.
        $this->assertNotNull(User::query()->find($user->id));
        $this->assertNotNull(File::query()->find($file->id));

        $reloadedFile = File::query()->find($file->id);
        $this->assertNotNull($reloadedFile);
        $this->assertSame('nimbusdrive/category-progress-file.bin', $reloadedFile->path);

        $this->assertSame($beforeCompletedAt, $reloaded->completed_at);
        $this->assertSame($beforeFailureCategory, $reloaded->failure_category);
    }

    public function test_account_delete_cleanup_manifest_rejects_an_unknown_category(): void
    {
        $user = User::factory()->create();

        $file = File::create([
            'user_id' => $user->id,
            'folder_id' => null,
            'original_name' => 'unknown-category-file.bin',
            'stored_name' => 'unknown-category-file.bin',
            'path' => 'nimbusdrive/unknown-category-file.bin',
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

        $this->assertSame('in_progress', $inProgressManifest->status);
        $this->assertSame(1, $inProgressManifest->attempt_count);
        $this->assertNull($inProgressManifest->completed_at);
        $this->assertNull($inProgressManifest->failure_category);

        $categoryStates = $inProgressManifest->category_states;
        $this->assertIsArray($categoryStates);
        $this->assertCount(10, $categoryStates);

        $operationId = $inProgressManifest->operation_id;
        $subjectUserId = $inProgressManifest->subject_user_id;
        $ownershipSnapshot = $inProgressManifest->ownership_snapshot;
        $status = $inProgressManifest->status;
        $attemptCount = $inProgressManifest->attempt_count;
        $lastAttemptAt = $inProgressManifest->last_attempt_at;
        $updatedAt = $inProgressManifest->updated_at;
        $completedAt = $inProgressManifest->completed_at;
        $failureCategory = $inProgressManifest->failure_category;

        foreach ($categoryStates as $key => $value) {
            $this->assertSame('pending', $value, "Category '{$key}' must start as pending");
        }

        $this->assertSame(
            [
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
            ],
            array_keys($categoryStates),
        );

        $this->assertSame(
            [
                'pending',
                'pending',
                'pending',
                'pending',
                'pending',
                'pending',
                'pending',
                'pending',
                'pending',
                'pending',
            ],
            array_values($categoryStates),
        );

        $this->assertIsArray($ownershipSnapshot);
        $this->assertContains(
            'nimbusdrive/unknown-category-file.bin',
            (array) $ownershipSnapshot['physical_paths'],
        );

        $beforeCategoryStates = $categoryStates;
        $unknownKey = 'unknown_cleanup_category';

        $completed = $service->markCategoryCompleted(
            $inProgressManifest,
            $unknownKey,
        );

        $this->assertFalse($completed);

        $after = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($after);

        $this->assertArrayNotHasKey(
            'unknown_cleanup_category',
            $after->category_states,
        );

        $this->assertSame($beforeCategoryStates, $after->category_states);
        $this->assertCount(10, $after->category_states);

        $this->assertSame($status, $after->status);
        $this->assertSame($attemptCount, $after->attempt_count);
        $this->assertTrue(
            $lastAttemptAt->equalTo($after->last_attempt_at)
        );
        $this->assertTrue(
            $updatedAt->equalTo($after->updated_at)
        );
        $this->assertSame($completedAt, $after->completed_at);
        $this->assertSame($failureCategory, $after->failure_category);
        $this->assertSame($operationId, $after->operation_id);
        $this->assertSame($subjectUserId, $after->subject_user_id);
        $this->assertSame($ownershipSnapshot, $after->ownership_snapshot);

        $this->assertNotNull(User::query()->find($user->id));

        $this->assertNotNull(File::query()->find($file->id));

        $reloadedFile = File::query()->find($file->id);
        $this->assertNotNull($reloadedFile);
        $this->assertSame($user->id, $reloadedFile->user_id);
        $this->assertSame('nimbusdrive/unknown-category-file.bin', $reloadedFile->path);

        // Ensure no new category was added and the keyset remains exactly 10.
        $this->assertSame(10, count($after->category_states));
    }

    public function test_account_delete_cleanup_manifest_rejects_a_missing_authorized_category_key(): void
    {

        $user = User::factory()->create();

        $file = File::create([
            'user_id' => $user->id,
            'folder_id' => null,
            'original_name' => 'missing-category-key-file.bin',
            'stored_name' => 'missing-category-key-file.bin',
            'path' => 'nimbusdrive/missing-category-key-file.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 321,
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

        $this->assertIsArray($inProgressManifest->category_states);
        $this->assertCount(10, $inProgressManifest->category_states);
        foreach ($inProgressManifest->category_states as $value) {
            $this->assertSame('pending', $value);
        }

        $this->assertArrayHasKey('share_links', $inProgressManifest->category_states);

        $corruptedCategoryStates = $inProgressManifest->category_states;
        unset($corruptedCategoryStates['share_links']);

        $inProgressManifest->category_states = $corruptedCategoryStates;
        $inProgressManifest->save();

        $afterCorruption = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($afterCorruption);

        $this->assertSame('in_progress', $afterCorruption->status);
        $this->assertSame(1, $afterCorruption->attempt_count);
        $this->assertNull($afterCorruption->completed_at);
        $this->assertNull($afterCorruption->failure_category);

        $this->assertIsArray($afterCorruption->category_states);
        $this->assertCount(9, $afterCorruption->category_states);
        $this->assertArrayNotHasKey('share_links', $afterCorruption->category_states);

        foreach ($afterCorruption->category_states as $value) {
            $this->assertSame('pending', $value);
        }

        $beforeCategoryStates = $afterCorruption->category_states;
        $beforeOperationId = $afterCorruption->operation_id;
        $beforeSubjectUserId = $afterCorruption->subject_user_id;
        $beforeOwnershipSnapshot = $afterCorruption->ownership_snapshot;
        $beforeStatus = $afterCorruption->status;
        $beforeAttemptCount = $afterCorruption->attempt_count;
        $beforeLastAttemptAt = $afterCorruption->last_attempt_at;
        $beforeUpdatedAt = $afterCorruption->updated_at;
        $beforeCompletedAt = $afterCorruption->completed_at;
        $beforeFailureCategory = $afterCorruption->failure_category;

        $this->assertIsArray($beforeOwnershipSnapshot);
        $this->assertArrayHasKey('physical_paths', $beforeOwnershipSnapshot);
        $this->assertContains(
            'nimbusdrive/missing-category-key-file.bin',
            (array) $beforeOwnershipSnapshot['physical_paths'],
        );

        $corruptedManifest = $afterCorruption;

        $completed = $service->markCategoryCompleted(
            $corruptedManifest,
            'share_links',
        );

        $this->assertFalse($completed);

        $after = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($after);

        $this->assertArrayNotHasKey(
            'share_links',
            $after->category_states,
        );

        $this->assertCount(9, $after->category_states);
        $this->assertSame($beforeCategoryStates, $after->category_states);

        foreach ($after->category_states as $value) {
            $this->assertSame('pending', $value);
        }

        $this->assertSame($beforeStatus, $after->status);
        $this->assertSame($beforeAttemptCount, $after->attempt_count);
        $this->assertTrue(
            $beforeLastAttemptAt->equalTo($after->last_attempt_at)
        );
        $this->assertTrue(
            $beforeUpdatedAt->equalTo($after->updated_at)
        );
        $this->assertSame($beforeCompletedAt, $after->completed_at);
        $this->assertSame($beforeFailureCategory, $after->failure_category);

        $this->assertSame($beforeOperationId, $after->operation_id);
        $this->assertSame($beforeSubjectUserId, $after->subject_user_id);
        $this->assertSame($beforeOwnershipSnapshot, $after->ownership_snapshot);

        $this->assertNotNull(User::query()->find($user->id));
        $this->assertNotNull(File::query()->find($file->id));

        $reloadedFile = File::query()->find($file->id);
        $this->assertNotNull($reloadedFile);
        $this->assertSame($user->id, $reloadedFile->user_id);
        $this->assertSame('nimbusdrive/missing-category-key-file.bin', $reloadedFile->path);
    }

    public function test_account_delete_cleanup_manifest_rejects_completing_a_failed_category(): void
    {

        $user = User::factory()->create();

        $file = File::create([
            'user_id' => $user->id,
            'folder_id' => null,
            'original_name' => 'failed-category-state-file.bin',
            'stored_name' => 'failed-category-state-file.bin',
            'path' => 'nimbusdrive/failed-category-state-file.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 111,
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

        $categoryStates = $inProgressManifest->category_states;
        $this->assertIsArray($categoryStates);
        $this->assertCount(10, $categoryStates);

        foreach ($categoryStates as $value) {
            $this->assertSame('pending', $value);
        }

        $failedCategoryStates = $inProgressManifest->category_states;
        $failedCategoryStates['physical_local_files'] = 'failed';
        $inProgressManifest->category_states = $failedCategoryStates;
        $inProgressManifest->save();

        $afterCorruption = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($afterCorruption);

        $this->assertSame('in_progress', $afterCorruption->status);
        $this->assertSame(1, $afterCorruption->attempt_count);
        $this->assertNull($afterCorruption->completed_at);
        $this->assertNull($afterCorruption->failure_category);

        $this->assertIsArray($afterCorruption->category_states);
        $this->assertCount(10, $afterCorruption->category_states);
        $this->assertSame('failed', $afterCorruption->category_states['physical_local_files']);

        foreach ($afterCorruption->category_states as $key => $value) {
            if ($key === 'physical_local_files') {
                continue;
            }
            $this->assertSame('pending', $value);
        }

        $beforeCategoryStates = $afterCorruption->category_states;
        $beforeOperationId = $afterCorruption->operation_id;
        $beforeSubjectUserId = $afterCorruption->subject_user_id;
        $beforeOwnershipSnapshot = $afterCorruption->ownership_snapshot;
        $beforeStatus = $afterCorruption->status;
        $beforeAttemptCount = $afterCorruption->attempt_count;
        $beforeLastAttemptAt = $afterCorruption->last_attempt_at;
        $beforeUpdatedAt = $afterCorruption->updated_at;
        $beforeCompletedAt = $afterCorruption->completed_at;
        $beforeFailureCategory = $afterCorruption->failure_category;

        $this->assertIsArray($beforeOwnershipSnapshot);
        $this->assertArrayHasKey('physical_paths', $beforeOwnershipSnapshot);
        $this->assertContains(
            'nimbusdrive/failed-category-state-file.bin',
            (array) $beforeOwnershipSnapshot['physical_paths'],
        );

        $failedCategoryManifest = $afterCorruption;

        $completed = $service->markCategoryCompleted(
            $failedCategoryManifest,
            'physical_local_files',
        );

        $this->assertFalse($completed);

        $after = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($after);

        $this->assertSame('failed', $after->category_states['physical_local_files']);
        $this->assertCount(10, $after->category_states);
        $this->assertSame($beforeCategoryStates, $after->category_states);

        foreach ($after->category_states as $key => $value) {
            if ($key === 'physical_local_files') {
                $this->assertSame('failed', $value);

                continue;
            }
            $this->assertSame('pending', $value);
        }

        $this->assertSame($beforeStatus, $after->status);
        $this->assertSame($beforeAttemptCount, $after->attempt_count);
        $this->assertTrue(
            $beforeLastAttemptAt->equalTo($after->last_attempt_at)
        );
        $this->assertTrue(
            $beforeUpdatedAt->equalTo($after->updated_at)
        );
        $this->assertSame($beforeCompletedAt, $after->completed_at);
        $this->assertSame($beforeFailureCategory, $after->failure_category);
        $this->assertSame($beforeOperationId, $after->operation_id);
        $this->assertSame($beforeSubjectUserId, $after->subject_user_id);
        $this->assertSame($beforeOwnershipSnapshot, $after->ownership_snapshot);

        $this->assertNotNull(User::query()->find($user->id));
        $this->assertNotNull(File::query()->find($file->id));

        $reloadedFile = File::query()->find($file->id);
        $this->assertNotNull($reloadedFile);
        $this->assertSame($user->id, $reloadedFile->user_id);
        $this->assertSame('nimbusdrive/failed-category-state-file.bin', $reloadedFile->path);
    }

    public function test_account_delete_cleanup_manifest_rejects_non_array_category_states(): void
    {

        $user = User::factory()->create();

        $file = File::create([
            'user_id' => $user->id,
            'folder_id' => null,
            'original_name' => 'non-array-category-states-file.bin',
            'stored_name' => 'non-array-category-states-file.bin',
            'path' => 'nimbusdrive/non-array-category-states-file.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 654,
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
        $this->assertIsArray($inProgressManifest->category_states);
        $this->assertCount(10, $inProgressManifest->category_states);
        $this->assertNull($inProgressManifest->completed_at);
        $this->assertNull($inProgressManifest->failure_category);

        DB::table('account_delete_cleanup_manifests')
            ->where('id', $inProgressManifest->getKey())
            ->update([
                'category_states' => json_encode(
                    'corrupted-non-array-category-states',
                    JSON_THROW_ON_ERROR,
                ),
            ]);

        $corruptedManifest = AccountDeleteCleanupManifest::query()
            ->find($inProgressManifest->getKey());
        $this->assertNotNull($corruptedManifest);

        $this->assertIsString($corruptedManifest->category_states);
        $this->assertSame(
            'corrupted-non-array-category-states',
            $corruptedManifest->category_states,
        );

        $operationId = $corruptedManifest->operation_id;
        $subjectUserId = $corruptedManifest->subject_user_id;
        $ownershipSnapshot = $corruptedManifest->ownership_snapshot;
        $status = $corruptedManifest->status;
        $attemptCount = $corruptedManifest->attempt_count;
        $beforeLastAttemptAt = $corruptedManifest->last_attempt_at;
        $beforeUpdatedAt = $corruptedManifest->updated_at;
        $beforeCompletedAt = $corruptedManifest->completed_at;
        $beforeFailureCategory = $corruptedManifest->failure_category;

        $this->assertNotNull($beforeLastAttemptAt);
        $this->assertNotNull($beforeUpdatedAt);

        $this->assertSame('in_progress', $status);
        $this->assertSame(1, $attemptCount);
        $this->assertNull($beforeCompletedAt);
        $this->assertNull($beforeFailureCategory);

        $completed = $service->markCategoryCompleted(
            $corruptedManifest,
            'physical_local_files',
        );

        $this->assertFalse($completed);

        $after = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($after);

        $this->assertIsString($after->category_states);
        $this->assertSame(
            'corrupted-non-array-category-states',
            $after->category_states,
        );

        $this->assertSame($status, $after->status);
        $this->assertSame($attemptCount, $after->attempt_count);
        $this->assertTrue(
            $beforeLastAttemptAt->equalTo($after->last_attempt_at)
        );
        $this->assertTrue(
            $beforeUpdatedAt->equalTo($after->updated_at)
        );
        $this->assertNull($after->completed_at);
        $this->assertNull($after->failure_category);
        $this->assertSame($operationId, $after->operation_id);
        $this->assertSame($subjectUserId, $after->subject_user_id);
        $this->assertSame($ownershipSnapshot, $after->ownership_snapshot);

        $this->assertIsString($after->category_states);

        $this->assertIsArray($ownershipSnapshot);
        $this->assertArrayHasKey('physical_paths', $ownershipSnapshot);
        $this->assertContains(
            'nimbusdrive/non-array-category-states-file.bin',
            (array) $ownershipSnapshot['physical_paths'],
        );

        $this->assertNotNull(User::query()->find($user->id));
        $this->assertNotNull(File::query()->find($file->id));

        $reloadedFile = File::query()->find($file->id);
        $this->assertNotNull($reloadedFile);
        $this->assertSame($user->id, $reloadedFile->user_id);
        $this->assertSame('nimbusdrive/non-array-category-states-file.bin', $reloadedFile->path);
    }

    public function test_account_delete_cleanup_manifest_rejects_null_category_states(): void
    {

        $user = User::factory()->create();

        $file = File::create([
            'user_id' => $user->id,
            'folder_id' => null,
            'original_name' => 'null-category-states-file.bin',
            'stored_name' => 'null-category-states-file.bin',
            'path' => 'nimbusdrive/null-category-states-file.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 777,
        ]);

        /** @var AccountDeleteCleanupManifestService $service */
        $service = app(AccountDeleteCleanupManifestService::class);

        $manifest = $service->createForUser($user);

        $started = $service->beginAttempt($manifest);
        $this->assertTrue($started);

        $inProgressManifest = AccountDeleteCleanupManifest::query()
            ->find($manifest->getKey());
        $this->assertNotNull($inProgressManifest);

        $this->assertSame('in_progress', $inProgressManifest->status);
        $this->assertSame(1, $inProgressManifest->attempt_count);
        $this->assertIsArray($inProgressManifest->category_states);
        $this->assertCount(10, $inProgressManifest->category_states);
        $this->assertNull($inProgressManifest->completed_at);
        $this->assertNull($inProgressManifest->failure_category);

        DB::table('account_delete_cleanup_manifests')
            ->where('id', $inProgressManifest->getKey())
            ->update([
                'category_states' => json_encode(
                    null,
                    JSON_THROW_ON_ERROR,
                ),
            ]);

        $corruptedManifest = AccountDeleteCleanupManifest::query()
            ->find($inProgressManifest->getKey());
        $this->assertNotNull($corruptedManifest);

        $this->assertNull($corruptedManifest->category_states);

        $this->assertSame('in_progress', $corruptedManifest->status);
        $this->assertSame(1, $corruptedManifest->attempt_count);
        $this->assertNull($corruptedManifest->completed_at);
        $this->assertNull($corruptedManifest->failure_category);

        $beforeCategoryStates = $corruptedManifest->category_states;
        $operationId = $corruptedManifest->operation_id;
        $subjectUserId = $corruptedManifest->subject_user_id;
        $ownershipSnapshot = $corruptedManifest->ownership_snapshot;
        $status = $corruptedManifest->status;
        $attemptCount = $corruptedManifest->attempt_count;
        $beforeLastAttemptAt = $corruptedManifest->last_attempt_at;
        $beforeUpdatedAt = $corruptedManifest->updated_at;
        $beforeCompletedAt = $corruptedManifest->completed_at;
        $beforeFailureCategory = $corruptedManifest->failure_category;

        $this->assertNotNull($beforeLastAttemptAt);
        $this->assertNotNull($beforeUpdatedAt);

        $completed = $service->markCategoryCompleted(
            $corruptedManifest,
            'physical_local_files',
        );
        $this->assertFalse($completed);

        $after = AccountDeleteCleanupManifest::query()
            ->find($inProgressManifest->getKey());
        $this->assertNotNull($after);

        $this->assertNull($after->category_states);

        $this->assertSame($status, $after->status);
        $this->assertSame($attemptCount, $after->attempt_count);
        $this->assertTrue(
            $beforeLastAttemptAt->equalTo($after->last_attempt_at)
        );
        $this->assertTrue(
            $beforeUpdatedAt->equalTo($after->updated_at)
        );
        $this->assertNull($after->completed_at);
        $this->assertNull($after->failure_category);
        $this->assertSame($operationId, $after->operation_id);
        $this->assertSame($subjectUserId, $after->subject_user_id);
        $this->assertSame($ownershipSnapshot, $after->ownership_snapshot);

        $this->assertNull($after->category_states);

        $this->assertIsArray($ownershipSnapshot);
        $this->assertArrayHasKey('physical_paths', $ownershipSnapshot);
        $this->assertContains(
            'nimbusdrive/null-category-states-file.bin',
            (array) $ownershipSnapshot['physical_paths'],
        );

        $this->assertNotNull(User::query()->find($user->id));
        $this->assertNotNull(File::query()->find($file->id));

        $reloadedFile = File::query()->find($file->id);
        $this->assertNotNull($reloadedFile);
        $this->assertSame($user->id, $reloadedFile->user_id);
        $this->assertSame('nimbusdrive/null-category-states-file.bin', $reloadedFile->path);
    }

    public function test_account_delete_cleanup_manifest_rejects_completing_the_same_category_twice(): void
    {

        $user = User::factory()->create();

        $file = File::create([
            'user_id' => $user->id,
            'folder_id' => null,
            'original_name' => 'replayed-category-completion-file.bin',
            'stored_name' => 'replayed-category-completion-file.bin',
            'path' => 'nimbusdrive/replayed-category-completion-file.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 555,
        ]);

        /** @var AccountDeleteCleanupManifestService $service */
        $service = app(AccountDeleteCleanupManifestService::class);

        $manifest = $service->createForUser($user);

        $started = $service->beginAttempt($manifest);
        $this->assertTrue($started);

        $inProgressManifest = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($inProgressManifest);

        $firstCompleted = $service->markCategoryCompleted(
            $inProgressManifest,
            'physical_local_files',
        );

        $this->assertTrue($firstCompleted);

        $completedCategoryManifest = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($completedCategoryManifest);

        $this->assertSame('in_progress', $completedCategoryManifest->status);
        $this->assertSame(1, $completedCategoryManifest->attempt_count);
        $this->assertSame('completed', $completedCategoryManifest->category_states['physical_local_files']);
        $this->assertNull($completedCategoryManifest->completed_at);
        $this->assertNull($completedCategoryManifest->failure_category);

        $beforeCategoryStates = $completedCategoryManifest->category_states;
        $beforeOperationId = $completedCategoryManifest->operation_id;
        $beforeSubjectUserId = $completedCategoryManifest->subject_user_id;
        $beforeOwnershipSnapshot = $completedCategoryManifest->ownership_snapshot;
        $beforeLastAttemptAt = $completedCategoryManifest->last_attempt_at;
        $beforeStatus = $completedCategoryManifest->status;
        $beforeAttemptCount = $completedCategoryManifest->attempt_count;
        $beforeCompletedAt = $completedCategoryManifest->completed_at;
        $beforeFailureCategory = $completedCategoryManifest->failure_category;

        $this->assertIsArray($beforeCategoryStates);
        $this->assertCount(10, $beforeCategoryStates);
        $this->assertSame(
            [
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
            ],
            array_keys($beforeCategoryStates),
        );

        $secondCompleted = $service->markCategoryCompleted(
            $completedCategoryManifest,
            'physical_local_files',
        );

        $this->assertFalse($secondCompleted);

        $after = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($after);

        $this->assertSame('in_progress', $after->status);
        $this->assertSame(1, $after->attempt_count);
        $this->assertNull($after->completed_at);
        $this->assertNull($after->failure_category);

        $this->assertTrue(
            $beforeLastAttemptAt->equalTo($after->last_attempt_at)
        );

        $this->assertSame($beforeOperationId, $after->operation_id);
        $this->assertSame($beforeSubjectUserId, $after->subject_user_id);
        $this->assertSame($beforeOwnershipSnapshot, $after->ownership_snapshot);
        $this->assertSame($beforeCategoryStates, $after->category_states);
        $this->assertCount(10, $after->category_states);

        $this->assertSame('completed', $after->category_states['physical_local_files']);
        $this->assertSame('pending', $after->category_states['database_records']);
        $this->assertSame('pending', $after->category_states['share_links']);
        $this->assertSame('pending', $after->category_states['devices']);
        $this->assertSame('pending', $after->category_states['oauth_identities']);
        $this->assertSame('pending', $after->category_states['sanctum_tokens']);
        $this->assertSame('pending', $after->category_states['google_drive_credentials']);
        $this->assertSame('pending', $after->category_states['activity_logs']);
        $this->assertSame('pending', $after->category_states['user_record']);
        $this->assertSame('pending', $after->category_states['other_user_owned_resources']);

        $this->assertSame($beforeStatus, $after->status);
        $this->assertSame($beforeAttemptCount, $after->attempt_count);
        $this->assertSame($beforeCompletedAt, $after->completed_at);
        $this->assertSame($beforeFailureCategory, $after->failure_category);

        $this->assertNotNull(User::query()->find($user->id));
        $this->assertNotNull(File::query()->find($file->id));

        $reloadedFile = File::query()->find($file->id);
        $this->assertNotNull($reloadedFile);
        $this->assertSame('nimbusdrive/replayed-category-completion-file.bin', $reloadedFile->path);

        $this->assertArrayHasKey('physical_paths', $after->ownership_snapshot);
        $this->assertContains(
            'nimbusdrive/replayed-category-completion-file.bin',
            (array) $after->ownership_snapshot['physical_paths'],
        );
    }

    public function test_account_delete_cleanup_manifest_rejects_category_completion_when_completed_at_is_set(): void
    {
        $user = User::factory()->create();

        $file = File::create([
            'user_id' => $user->id,
            'folder_id' => null,
            'original_name' => 'completed-at-category-file.bin',
            'stored_name' => 'completed-at-category-file.bin',
            'path' => 'nimbusdrive/completed-at-category-file.bin',
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

        $categoryStates = $inProgressManifest->category_states;
        $this->assertIsArray($categoryStates);
        $this->assertCount(10, $categoryStates);
        foreach ($categoryStates as $value) {
            $this->assertSame('pending', $value);
        }

        $completedAt = now('UTC')->startOfSecond();

        $inProgressManifest->completed_at = $completedAt;
        $inProgressManifest->save();

        $terminalManifest = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($terminalManifest);

        $this->assertSame('in_progress', $terminalManifest->status);
        $this->assertSame(1, $terminalManifest->attempt_count);
        $this->assertNotNull($terminalManifest->completed_at);
        $this->assertTrue($terminalManifest->completed_at->equalTo($completedAt));
        $this->assertNull($terminalManifest->failure_category);

        $this->assertIsArray($terminalManifest->category_states);
        $this->assertCount(10, $terminalManifest->category_states);
        foreach ($terminalManifest->category_states as $value) {
            $this->assertSame('pending', $value);
        }

        $beforeCategoryStates = $terminalManifest->category_states;
        $beforeOperationId = $terminalManifest->operation_id;
        $beforeSubjectUserId = $terminalManifest->subject_user_id;
        $beforeOwnershipSnapshot = $terminalManifest->ownership_snapshot;
        $beforeStatus = $terminalManifest->status;
        $beforeAttemptCount = $terminalManifest->attempt_count;
        $beforeLastAttemptAt = $terminalManifest->last_attempt_at;
        $beforeUpdatedAt = $terminalManifest->updated_at;
        $beforeCompletedAt = $terminalManifest->completed_at;
        $beforeFailureCategory = $terminalManifest->failure_category;

        $this->assertNotNull($beforeUpdatedAt);
        $this->assertNotNull($beforeCompletedAt);

        $completed = $service->markCategoryCompleted(
            $terminalManifest,
            'physical_local_files',
        );

        $this->assertFalse($completed);

        $after = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($after);

        $this->assertSame('in_progress', $after->status);
        $this->assertSame(1, $after->attempt_count);
        $this->assertNotNull($after->completed_at);
        $this->assertNull($after->failure_category);

        $this->assertTrue(
            $beforeLastAttemptAt->equalTo($after->last_attempt_at)
        );
        $this->assertTrue(
            $beforeUpdatedAt->equalTo($after->updated_at)
        );
        $this->assertTrue(
            $beforeCompletedAt->equalTo($after->completed_at)
        );

        $this->assertSame($beforeFailureCategory, $after->failure_category);
        $this->assertSame($beforeStatus, $after->status);
        $this->assertSame($beforeAttemptCount, $after->attempt_count);

        $this->assertSame('pending', $after->category_states['physical_local_files']);
        $this->assertIsArray($after->category_states);
        $this->assertCount(10, $after->category_states);
        $this->assertSame($beforeCategoryStates, $after->category_states);

        $this->assertSame($beforeOperationId, $after->operation_id);
        $this->assertSame($beforeSubjectUserId, $after->subject_user_id);
        $this->assertSame($beforeOwnershipSnapshot, $after->ownership_snapshot);

        $this->assertIsArray($after->ownership_snapshot);
        $this->assertContains(
            'nimbusdrive/completed-at-category-file.bin',
            (array) $after->ownership_snapshot['physical_paths'],
        );

        $this->assertNotNull(User::query()->find($user->id));
        $this->assertNotNull(File::query()->find($file->id));

        $reloadedFile = File::query()->find($file->id);
        $this->assertNotNull($reloadedFile);
        $this->assertSame($user->id, $reloadedFile->user_id);
        $this->assertSame('nimbusdrive/completed-at-category-file.bin', $reloadedFile->path);
    }

    public function test_account_delete_cleanup_manifest_rejects_category_completion_while_pending(): void
    {
        $user = User::factory()->create();

        $file = File::create([
            'user_id' => $user->id,
            'folder_id' => null,
            'original_name' => 'pending-manifest-category-file.bin',
            'stored_name' => 'pending-manifest-category-file.bin',
            'path' => 'nimbusdrive/pending-manifest-category-file.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 100,
        ]);

        /** @var AccountDeleteCleanupManifestService $service */
        $service = app(AccountDeleteCleanupManifestService::class);

        $manifest = $service->createForUser($user);

        $pendingManifest = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($pendingManifest);

        $this->assertSame('pending', $pendingManifest->status);
        $this->assertSame(0, $pendingManifest->attempt_count);
        $this->assertNull($pendingManifest->last_attempt_at);
        $this->assertNull($pendingManifest->completed_at);
        $this->assertNull($pendingManifest->failure_category);

        $categoryStates = $pendingManifest->category_states;
        $this->assertIsArray($categoryStates);
        $this->assertCount(10, $categoryStates);

        $authorizedKeys = [
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

        $this->assertSame($authorizedKeys, array_keys($categoryStates));

        foreach ($categoryStates as $value) {
            $this->assertSame('pending', $value);
        }

        $beforeCategoryStates = $pendingManifest->category_states;
        $beforeOperationId = $pendingManifest->operation_id;
        $beforeSubjectUserId = $pendingManifest->subject_user_id;
        $beforeOwnershipSnapshot = $pendingManifest->ownership_snapshot;
        $beforeStatus = $pendingManifest->status;
        $beforeAttemptCount = $pendingManifest->attempt_count;
        $beforeLastAttemptAt = $pendingManifest->last_attempt_at;
        $beforeUpdatedAt = $pendingManifest->updated_at;
        $beforeCompletedAt = $pendingManifest->completed_at;
        $beforeFailureCategory = $pendingManifest->failure_category;

        $this->assertNotNull($beforeUpdatedAt);

        $completed = $service->markCategoryCompleted(
            $pendingManifest,
            'physical_local_files',
        );

        $this->assertFalse($completed);

        $after = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($after);

        $this->assertSame('pending', $after->status);
        $this->assertSame(0, $after->attempt_count);
        $this->assertNull($after->last_attempt_at);
        $this->assertNull($after->completed_at);
        $this->assertNull($after->failure_category);

        $this->assertSame('pending', $after->category_states['physical_local_files']);
        $this->assertSame($beforeCategoryStates, $after->category_states);
        $this->assertSame($beforeOperationId, $after->operation_id);
        $this->assertSame($beforeSubjectUserId, $after->subject_user_id);
        $this->assertSame($beforeOwnershipSnapshot, $after->ownership_snapshot);

        $this->assertTrue(
            $beforeUpdatedAt->equalTo($after->updated_at)
        );

        $this->assertSame(
            'nimbusdrive/pending-manifest-category-file.bin',
            $after->ownership_snapshot['physical_paths'][0],
        );

        $this->assertNotNull(User::query()->find($user->id));

        $reloadedFile = File::query()->find($file->id);
        $this->assertNotNull($reloadedFile);
        $this->assertSame($user->id, $reloadedFile->user_id);
        $this->assertSame('nimbusdrive/pending-manifest-category-file.bin', $reloadedFile->path);
    }
}

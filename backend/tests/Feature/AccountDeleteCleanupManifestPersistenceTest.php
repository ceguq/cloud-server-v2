<?php

namespace Tests\Feature;

use App\Models\AccountDeleteCleanupManifest;
use App\Models\File;
use App\Models\User;
use App\Services\AccountDeleteCleanupManifestService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AccountDeleteCleanupManifestPersistenceTest extends TestCase
{
    use RefreshDatabase;

    public function test_account_delete_cleanup_manifest_survives_original_user_deletion(): void
    {
        $user = User::factory()->create();

        $file = File::create([
            'user_id' => $user->id,
            'folder_id' => null,
            'original_name' => 'survival-contract-file.bin',
            'stored_name' => 'survival-contract-file.bin',
            'path' => 'nimbusdrive/survival-contract-file.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 111,
        ]);

        /** @var AccountDeleteCleanupManifestService $service */
        $service = app(AccountDeleteCleanupManifestService::class);

        $manifest = $service->createForUser($user);

        $manifestId = $manifest->getKey();
        $operationId = $manifest->operation_id;
        $subjectUserId = (int) $manifest->subject_user_id;
        $ownershipSnapshot = $manifest->ownership_snapshot;
        $categoryStates = $manifest->category_states;

        $this->assertTrue($manifest->exists);
        $this->assertNotNull($manifestId);
        $this->assertIsString($operationId);

        // Hard-delete the original user record.
        $user->forceDelete();

        $this->assertNull(User::query()->find($user->id));

        $reloaded = AccountDeleteCleanupManifest::query()->find($manifestId);

        $this->assertNotNull($reloaded);
        $this->assertSame($subjectUserId, (int) $reloaded->subject_user_id);
        $this->assertSame($operationId, $reloaded->operation_id);
        $this->assertSame($ownershipSnapshot, $reloaded->ownership_snapshot);
        $this->assertSame($categoryStates, $reloaded->category_states);
        $this->assertSame('pending', $reloaded->status);
        $this->assertSame(0, (int) $reloaded->attempt_count);

        $this->assertArrayHasKey('physical_paths', $reloaded->ownership_snapshot);
        $this->assertContains(
            'nimbusdrive/survival-contract-file.bin',
            (array) $reloaded->ownership_snapshot['physical_paths'],
        );
    }

    public function test_account_delete_cleanup_manifest_is_durably_persisted_before_destructive_cleanup(): void
    {
        $user = User::factory()->create();

        $activeFile = File::create([
            'user_id' => $user->id,
            'folder_id' => null,
            'original_name' => 'durable-active-file.bin',
            'stored_name' => 'durable-active-file.bin',
            'path' => 'nimbusdrive/durable-active-file.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 123,
        ]);

        $trashedFile = File::create([
            'user_id' => $user->id,
            'folder_id' => null,
            'original_name' => 'durable-trashed-file.bin',
            'stored_name' => 'durable-trashed-file.bin',
            'path' => 'nimbusdrive/durable-trashed-file.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 456,
        ]);

        // Soft-delete the second file using normal model behavior.
        $trashedFile->delete();

        /** @var AccountDeleteCleanupManifestService $service */
        $service = app(AccountDeleteCleanupManifestService::class);

        $manifest = $service->createForUser($user);

        $this->assertInstanceOf(AccountDeleteCleanupManifest::class, $manifest);
        $this->assertTrue($manifest->exists);

        $this->assertIsString($manifest->operation_id);
        $this->assertNotSame('', $manifest->operation_id);

        $this->assertSame($user->getKey(), $manifest->subject_user_id);
        $this->assertSame('pending', $manifest->status);

        $this->assertSame(0, $manifest->attempt_count);
        $this->assertNull($manifest->last_attempt_at);
        $this->assertNull($manifest->completed_at);
        $this->assertNull($manifest->failure_category);

        $expectedOwnershipSnapshot = [
            'subject_user_id' => $user->getKey(),
            'physical_paths' => [
                'nimbusdrive/durable-active-file.bin',
                'nimbusdrive/durable-trashed-file.bin',
            ],
        ];

        $actualOwnershipSnapshot = $manifest->ownership_snapshot;

        // Compare semantically without relying on key order.
        $this->assertIsArray($actualOwnershipSnapshot);
        $this->assertSame($expectedOwnershipSnapshot['subject_user_id'], $actualOwnershipSnapshot['subject_user_id']);

        $this->assertArrayHasKey('physical_paths', $actualOwnershipSnapshot);
        $actualPhysicalPaths = (array) $actualOwnershipSnapshot['physical_paths'];
        $actualPhysicalPathsSorted = array_values(array_unique($actualPhysicalPaths));
        sort($actualPhysicalPathsSorted);

        $expectedPhysicalPathsSorted = $expectedOwnershipSnapshot['physical_paths'];
        sort($expectedPhysicalPathsSorted);

        $this->assertSame($expectedPhysicalPathsSorted, $actualPhysicalPathsSorted);

        $expectedCategoryStates = [
            'database_records' => 'pending',
            'physical_local_files' => 'pending',
            'share_links' => 'pending',
            'devices' => 'pending',
            'oauth_identities' => 'pending',
            'sanctum_tokens' => 'pending',
            'google_drive_credentials' => 'pending',
            'activity_logs' => 'pending',
            'other_user_owned_resources' => 'pending',
            'user_record' => 'pending',
        ];

        $actualCategoryStates = $manifest->category_states;
        $this->assertIsArray($actualCategoryStates);
        $this->assertSame($expectedCategoryStates, $actualCategoryStates);

        // Persistence assertions: user survives, files survive with expected soft-delete state.
        $this->assertNotNull(User::query()->find($user->id));

        $activeRow = File::query()->where('id', $activeFile->id)->first();
        $this->assertNotNull($activeRow);
        $this->assertNull($activeRow->deleted_at);

        $softDeletedRow = File::query()->withTrashed()->where('id', $trashedFile->id)->first();
        $this->assertNotNull($softDeletedRow);
        $this->assertNotNull($softDeletedRow->deleted_at);

        // No physical files are created or deleted by this test.
        // (This contract test only asserts DB/soft-delete state.)
    }
}

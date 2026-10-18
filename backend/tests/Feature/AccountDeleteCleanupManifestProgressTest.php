<?php

namespace Tests\Feature;

use App\Models\AccountDeleteCleanupManifest;
use App\Models\File;
use App\Models\User;
use App\Services\AccountDeleteCleanupManifestService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AccountDeleteCleanupManifestProgressTest extends TestCase
{
    use RefreshDatabase;

    public function test_account_delete_cleanup_manifest_can_begin_its_first_attempt(): void
    {
        $user = User::factory()->create();

        $file = File::create([
            'user_id' => $user->id,
            'folder_id' => null,
            'original_name' => 'first-cleanup-attempt-file.bin',
            'stored_name' => 'first-cleanup-attempt-file.bin',
            'path' => 'nimbusdrive/first-cleanup-attempt-file.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 222,
        ]);

        /** @var AccountDeleteCleanupManifestService $service */
        $service = app(AccountDeleteCleanupManifestService::class);

        $manifest = $service->createForUser($user);

        $this->assertSame('pending', $manifest->status);
        $this->assertSame(0, $manifest->attempt_count);
        $this->assertNull($manifest->last_attempt_at);
        $this->assertNull($manifest->completed_at);
        $this->assertNull($manifest->failure_category);

        $operationId = $manifest->operation_id;
        $subjectUserId = $manifest->subject_user_id;
        $ownershipSnapshot = $manifest->ownership_snapshot;
        $categoryStates = $manifest->category_states;

        $started = $service->beginAttempt($manifest);
        $this->assertTrue($started);

        $reloaded = AccountDeleteCleanupManifest::query()->find($manifest->getKey());

        $this->assertNotNull($reloaded);
        $this->assertSame('in_progress', $reloaded->status);
        $this->assertSame(1, $reloaded->attempt_count);
        $this->assertNotNull($reloaded->last_attempt_at);

        $this->assertSame($operationId, $reloaded->operation_id);
        $this->assertSame($subjectUserId, $reloaded->subject_user_id);
        $this->assertSame($ownershipSnapshot, $reloaded->ownership_snapshot);
        $this->assertSame($categoryStates, $reloaded->category_states);

        $this->assertNull($reloaded->completed_at);
        $this->assertNull($reloaded->failure_category);

        // Read-only guarantees: user + file metadata remain.
        $this->assertNotNull(User::query()->find($user->id));
        $this->assertNotNull(File::query()->find($file->id));
    }

    public function test_account_delete_cleanup_manifest_rejects_a_second_first_attempt(): void
    {
        $user = User::factory()->create();

        $file = File::create([
            'user_id' => $user->id,
            'folder_id' => null,
            'original_name' => 'replayed-first-attempt-file.bin',
            'stored_name' => 'replayed-first-attempt-file.bin',
            'path' => 'nimbusdrive/replayed-first-attempt-file.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 333,
        ]);

        /** @var AccountDeleteCleanupManifestService $service */
        $service = app(AccountDeleteCleanupManifestService::class);

        $manifest = $service->createForUser($user);

        $firstStarted = $service->beginAttempt($manifest);
        $this->assertTrue($firstStarted);

        $reloaded = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($reloaded);

        $beforeStatus = $reloaded->status;
        $beforeAttemptCount = $reloaded->attempt_count;
        $beforeLastAttemptAt = $reloaded->last_attempt_at;
        $beforeOperationId = $reloaded->operation_id;
        $beforeSubjectUserId = $reloaded->subject_user_id;
        $beforeOwnershipSnapshot = $reloaded->ownership_snapshot;
        $beforeCategoryStates = $reloaded->category_states;

        $secondStarted = $service->beginAttempt($reloaded);
        $this->assertFalse($secondStarted);

        $after = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($after);

        $this->assertSame('in_progress', $after->status);
        $this->assertSame(1, $after->attempt_count);

        $this->assertTrue(
            $beforeLastAttemptAt->equalTo($after->last_attempt_at)
        );

        $this->assertSame($beforeOperationId, $after->operation_id);
        $this->assertSame($beforeSubjectUserId, $after->subject_user_id);
        $this->assertSame($beforeOwnershipSnapshot, $after->ownership_snapshot);
        $this->assertSame($beforeCategoryStates, $after->category_states);

        $this->assertNull($after->completed_at);
        $this->assertNull($after->failure_category);

        $this->assertNotNull(User::query()->find($user->id));
        $this->assertNotNull(File::query()->find($file->id));

        // Ensure preconditions were correct for anti-replay.
        $this->assertSame('in_progress', $beforeStatus);
        $this->assertSame(1, $beforeAttemptCount);
        $this->assertNotNull($beforeLastAttemptAt);
    }
}

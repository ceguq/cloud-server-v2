<?php

namespace Tests\Feature;

use App\Models\AccountDeleteCleanupManifest;
use App\Models\File;
use App\Models\ShareLink;
use App\Models\User;
use App\Services\AccountDeleteCleanupManifestService;
use App\Services\AccountDeleteShareLinksCleanupService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AccountDeleteShareLinksCleanupCompletedAtTest extends TestCase
{
    use RefreshDatabase;

    public function test_share_links_cleanup_rejects_manifest_with_completed_at_without_deleting_links(): void
    {
        $subjectUser = User::factory()->create();

        $this->assertNotNull(User::query()->find($subjectUser->id));

        $file = File::create([
            'user_id' => $subjectUser->id,
            'folder_id' => null,
            'original_name' => 'share-cleanup-completed-at.bin',
            'stored_name' => 'share-cleanup-completed-at.bin',
            'path' => 'nimbusdrive/share-cleanup-completed-at.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 1,
        ]);

        $this->assertNotNull(File::query()->find($file->id));

        $shareLink = ShareLink::create([
            'file_id' => $file->id,
            'token' => 'completed-at-share-token',
            'expires_at' => null,
            'password' => null,
            'download_count' => 0,
        ]);

        $this->assertNotNull(ShareLink::query()->where('token', 'completed-at-share-token')->first());

        $manifestService = app(AccountDeleteCleanupManifestService::class);

        $manifest = $manifestService->createForUser($subjectUser);

        $started = $manifestService->beginAttempt($manifest);

        $this->assertTrue($started);

        $inProgressManifest = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($inProgressManifest);

        $this->assertSame('in_progress', $inProgressManifest->status);
        $this->assertSame(1, (int) $inProgressManifest->attempt_count);
        $this->assertSame('pending', $inProgressManifest->category_states['share_links']);
        $this->assertNull($inProgressManifest->completed_at);
        $this->assertNull($inProgressManifest->failure_category);

        $completedAt = now('UTC')->startOfSecond();

        $inProgressManifest->completed_at = $completedAt;
        $inProgressManifest->save();

        $persistedManifest = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($persistedManifest);

        $this->assertSame('in_progress', $persistedManifest->status);
        $this->assertSame('pending', $persistedManifest->category_states['share_links']);
        $this->assertSame(1, (int) $persistedManifest->attempt_count);
        $this->assertTrue($completedAt->equalTo($persistedManifest->completed_at));
        $this->assertNull($persistedManifest->failure_category);

        $operationId = $persistedManifest->operation_id;
        $subjectUserId = $persistedManifest->subject_user_id;
        $ownershipSnapshot = $persistedManifest->ownership_snapshot;
        $categoryStates = $persistedManifest->category_states;
        $status = $persistedManifest->status;
        $attemptCount = $persistedManifest->attempt_count;
        $lastAttemptAt = $persistedManifest->last_attempt_at;
        $completedAtPersisted = $persistedManifest->completed_at;
        $failureCategory = $persistedManifest->failure_category;
        $createdAt = $persistedManifest->created_at;
        $updatedAt = $persistedManifest->updated_at;

        $cleanupService = app(AccountDeleteShareLinksCleanupService::class);

        $deletedCount = $cleanupService->cleanup($persistedManifest);

        $this->assertSame(0, $deletedCount);

        $this->assertNotNull(
            ShareLink::query()->where('token', 'completed-at-share-token')->first(),
        );

        $preservedShareLink = ShareLink::query()->where('token', 'completed-at-share-token')->first();
        $this->assertNotNull($preservedShareLink);
        $this->assertSame($file->id, $preservedShareLink->file_id);

        $this->assertNotNull(User::query()->find($subjectUser->id));

        $fileAfter = File::query()->find($file->id);
        $this->assertNotNull($fileAfter);
        $this->assertSame($subjectUser->id, $fileAfter->user_id);
        $this->assertSame('nimbusdrive/share-cleanup-completed-at.bin', $fileAfter->path);

        $afterManifest = AccountDeleteCleanupManifest::query()->find($persistedManifest->getKey());
        $this->assertNotNull($afterManifest);

        $this->assertSame($status, $afterManifest->status);
        $this->assertSame($categoryStates, $afterManifest->category_states);
        $this->assertSame($attemptCount, (int) $afterManifest->attempt_count);
        $this->assertTrue($completedAtPersisted->equalTo($afterManifest->completed_at));
        $this->assertSame($failureCategory, $afterManifest->failure_category);

        $this->assertSame($operationId, $afterManifest->operation_id);
        $this->assertSame($subjectUserId, $afterManifest->subject_user_id);
        $this->assertSame($ownershipSnapshot, $afterManifest->ownership_snapshot);
        $this->assertTrue($lastAttemptAt->equalTo($afterManifest->last_attempt_at));
        $this->assertTrue($createdAt->equalTo($afterManifest->created_at));
        $this->assertTrue($updatedAt->equalTo($afterManifest->updated_at));

        $this->assertSame('in_progress', $afterManifest->status);
        $this->assertSame('pending', $afterManifest->category_states['share_links']);
        $this->assertSame($attemptCount, (int) $afterManifest->attempt_count);
        $this->assertTrue($completedAtPersisted->equalTo($afterManifest->completed_at));
        $this->assertNull($afterManifest->failure_category);
    }
}

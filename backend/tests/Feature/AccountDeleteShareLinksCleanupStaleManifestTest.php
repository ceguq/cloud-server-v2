<?php

namespace Tests\Feature;

use App\Models\File;
use App\Models\ShareLink;
use App\Models\User;
use App\Services\AccountDeleteCleanupManifestService;
use App\Services\AccountDeleteShareLinksCleanupService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AccountDeleteShareLinksCleanupStaleManifestTest extends TestCase
{
    use RefreshDatabase;

    public function test_share_links_cleanup_rejects_stale_manifest_after_category_was_completed(): void
    {
        $subjectUser = User::factory()->create();

        $this->assertNotNull(User::query()->find($subjectUser->id));

        // No physical file creation; we only create metadata.
        $file = File::create([
            'user_id' => $subjectUser->id,
            'folder_id' => null,
            'original_name' => 'share-cleanup-stale-manifest.bin',
            'stored_name' => 'share-cleanup-stale-manifest.bin',
            'path' => 'nimbusdrive/share-cleanup-stale-manifest.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 1,
        ]);

        $this->assertNotNull(File::query()->find($file->id));

        $shareLink = ShareLink::create([
            'file_id' => $file->id,
            'token' => 'stale-manifest-share-token',
            'expires_at' => null,
            'password' => null,
            'download_count' => 0,
        ]);

        $this->assertNotNull(ShareLink::query()->where('token', 'stale-manifest-share-token')->first());

        $this->assertSame($file->id, $shareLink->file_id);

        $manifestService = app(AccountDeleteCleanupManifestService::class);

        $manifest = $manifestService->createForUser($subjectUser);

        $started = $manifestService->beginAttempt($manifest);

        $this->assertTrue($started);

        $staleManifest = $manifest->fresh();

        $this->assertSame('in_progress', $staleManifest->status);
        $this->assertSame(1, (int) $staleManifest->attempt_count);
        $this->assertSame('pending', $staleManifest->category_states['share_links']);
        $this->assertNull($staleManifest->completed_at);
        $this->assertNull($staleManifest->failure_category);

        // Preserve the stale in-memory state.

        $freshManifest = $manifest->fresh();

        $markedCompleted = $manifestService->markCategoryCompleted(
            $freshManifest,
            'share_links',
        );

        $this->assertTrue($markedCompleted);

        $persistedCompletedManifest = $manifest->fresh();

        $this->assertSame('in_progress', $persistedCompletedManifest->status);
        $this->assertSame(1, (int) $persistedCompletedManifest->attempt_count);
        $this->assertSame('completed', $persistedCompletedManifest->category_states['share_links']);
        $this->assertNull($persistedCompletedManifest->completed_at);
        $this->assertNull($persistedCompletedManifest->failure_category);

        $this->assertSame(
            'pending',
            $staleManifest->category_states['share_links'],
        );

        $this->assertSame(
            'completed',
            $persistedCompletedManifest->category_states['share_links'],
        );

        $this->assertSame($persistedCompletedManifest->getKey(), $staleManifest->getKey());
        $this->assertSame($persistedCompletedManifest->operation_id, $staleManifest->operation_id);

        $operationId = $persistedCompletedManifest->operation_id;
        $subjectUserId = $persistedCompletedManifest->subject_user_id;
        $ownershipSnapshot = $persistedCompletedManifest->ownership_snapshot;
        $categoryStates = $persistedCompletedManifest->category_states;
        $status = $persistedCompletedManifest->status;
        $attemptCount = $persistedCompletedManifest->attempt_count;
        $lastAttemptAt = $persistedCompletedManifest->last_attempt_at;
        $completedAt = $persistedCompletedManifest->completed_at;
        $failureCategory = $persistedCompletedManifest->failure_category;
        $createdAt = $persistedCompletedManifest->created_at;
        $updatedAt = $persistedCompletedManifest->updated_at;

        $this->assertSame($subjectUser->id, $subjectUserId);
        $this->assertSame($file->id, $shareLink->file_id);

        $cleanupService = app(AccountDeleteShareLinksCleanupService::class);

        $deletedCount = $cleanupService->cleanup($staleManifest);

        $this->assertSame(0, $deletedCount);

        $this->assertNotNull(
            ShareLink::query()->where('token', 'stale-manifest-share-token')->first(),
        );

        $preservedShareLink = ShareLink::query()->where('token', 'stale-manifest-share-token')->first();
        $this->assertSame($file->id, $preservedShareLink->file_id);

        $this->assertNotNull(User::query()->find($subjectUser->id));

        $fileAfter = File::query()->find($file->id);
        $this->assertNotNull($fileAfter);
        $this->assertSame($subjectUser->id, $fileAfter->user_id);
        $this->assertSame('nimbusdrive/share-cleanup-stale-manifest.bin', $fileAfter->path);

        $afterManifest = $manifest->fresh();

        $this->assertSame('in_progress', $afterManifest->status);
        $this->assertSame('completed', $afterManifest->category_states['share_links']);
        $this->assertSame(1, (int) $afterManifest->attempt_count);
        $this->assertNull($afterManifest->completed_at);
        $this->assertNull($afterManifest->failure_category);

        $this->assertSame($operationId, $afterManifest->operation_id);
        $this->assertSame($subjectUserId, $afterManifest->subject_user_id);
        $this->assertSame($ownershipSnapshot, $afterManifest->ownership_snapshot);
        $this->assertSame($categoryStates, $afterManifest->category_states);
        $this->assertSame($status, $afterManifest->status);
        $this->assertSame($attemptCount, (int) $afterManifest->attempt_count);
        $this->assertTrue($lastAttemptAt->equalTo($afterManifest->last_attempt_at));
        $this->assertNull($afterManifest->completed_at);
        $this->assertNull($afterManifest->failure_category);
        $this->assertTrue($createdAt->equalTo($afterManifest->created_at));
        $this->assertTrue($updatedAt->equalTo($afterManifest->updated_at));
    }
}

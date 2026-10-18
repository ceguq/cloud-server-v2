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

class AccountDeleteShareLinksCleanupPendingManifestTest extends TestCase
{
    use RefreshDatabase;

    public function test_share_links_cleanup_rejects_pending_manifest_without_deleting_links(): void
    {
        $subjectUser = User::factory()->create();

        $this->assertNotNull(User::query()->find($subjectUser->id));

        $file = File::create([
            'user_id' => $subjectUser->id,
            'folder_id' => null,
            'original_name' => 'share-cleanup-pending-manifest.bin',
            'stored_name' => 'share-cleanup-pending-manifest.bin',
            'path' => 'nimbusdrive/share-cleanup-pending-manifest.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 1,
        ]);

        $this->assertNotNull(File::query()->find($file->id));

        $shareLink = ShareLink::create([
            'file_id' => $file->id,
            'token' => 'pending-manifest-share-token',
            'expires_at' => null,
            'password' => null,
            'download_count' => 0,
        ]);

        $this->assertNotNull(ShareLink::query()->where('token', 'pending-manifest-share-token')->first());

        $manifestService = app(AccountDeleteCleanupManifestService::class);

        $manifest = $manifestService->createForUser($subjectUser);

        $pendingManifest = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($pendingManifest);
        $this->assertSame('pending', $pendingManifest->status);
        $this->assertSame(0, (int) $pendingManifest->attempt_count);
        $this->assertNull($pendingManifest->last_attempt_at);
        $this->assertNull($pendingManifest->completed_at);
        $this->assertNull($pendingManifest->failure_category);
        $this->assertSame('pending', $pendingManifest->category_states['share_links']);

        $beforeOperationId = $pendingManifest->operation_id;
        $beforeSubjectUserId = $pendingManifest->subject_user_id;
        $beforeOwnershipSnapshot = $pendingManifest->ownership_snapshot;
        $beforeCategoryStates = $pendingManifest->category_states;
        $beforeStatus = $pendingManifest->status;
        $beforeAttemptCount = $pendingManifest->attempt_count;
        $beforeLastAttemptAt = $pendingManifest->last_attempt_at;
        $beforeCompletedAt = $pendingManifest->completed_at;
        $beforeFailureCategory = $pendingManifest->failure_category;
        $beforeCreatedAt = $pendingManifest->created_at;
        $beforeUpdatedAt = $pendingManifest->updated_at;

        $cleanupService = app(AccountDeleteShareLinksCleanupService::class);

        $deletedCount = $cleanupService->cleanup($pendingManifest);
        $this->assertSame(0, $deletedCount);

        $this->assertDatabaseHas('share_links', [
            'id' => $shareLink->id,
            'file_id' => $file->id,
            'token' => 'pending-manifest-share-token',
        ]);

        $this->assertDatabaseHas('users', [
            'id' => $subjectUser->id,
        ]);

        $this->assertDatabaseHas('files', [
            'id' => $file->id,
            'user_id' => $subjectUser->id,
            'path' => 'nimbusdrive/share-cleanup-pending-manifest.bin',
        ]);

        $afterManifest = AccountDeleteCleanupManifest::query()->find($pendingManifest->getKey());
        $this->assertNotNull($afterManifest);

        $this->assertSame($beforeOperationId, $afterManifest->operation_id);
        $this->assertSame($beforeSubjectUserId, $afterManifest->subject_user_id);
        $this->assertSame($beforeOwnershipSnapshot, $afterManifest->ownership_snapshot);
        $this->assertSame($beforeCategoryStates, $afterManifest->category_states);
        $this->assertSame($beforeStatus, $afterManifest->status);
        $this->assertSame($beforeAttemptCount, (int) $afterManifest->attempt_count);
        $this->assertNull($afterManifest->last_attempt_at);
        $this->assertNull($afterManifest->completed_at);
        $this->assertNull($afterManifest->failure_category);

        $this->assertTrue($beforeCreatedAt->equalTo($afterManifest->created_at));
        $this->assertTrue($beforeUpdatedAt->equalTo($afterManifest->updated_at));

        $this->assertSame('pending', $afterManifest->status);
        $this->assertSame(0, (int) $afterManifest->attempt_count);
        $this->assertSame('pending', $afterManifest->category_states['share_links']);
        $this->assertNull($afterManifest->last_attempt_at);
        $this->assertNull($afterManifest->completed_at);
        $this->assertNull($afterManifest->failure_category);
    }
}

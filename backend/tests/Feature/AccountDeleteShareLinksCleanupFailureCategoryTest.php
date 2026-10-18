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

class AccountDeleteShareLinksCleanupFailureCategoryTest extends TestCase
{
    use RefreshDatabase;

    public function test_share_links_cleanup_rejects_manifest_with_failure_category_without_deleting_links(): void
    {
        $subjectUser = User::factory()->create();

        $this->assertNotNull(User::query()->find($subjectUser->id));

        $file = File::create([
            'user_id' => $subjectUser->id,
            'folder_id' => null,
            'original_name' => 'share-cleanup-failure-category.bin',
            'stored_name' => 'share-cleanup-failure-category.bin',
            'path' => 'nimbusdrive/share-cleanup-failure-category.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 1,
        ]);

        $this->assertNotNull(File::query()->find($file->id));

        $shareLink = ShareLink::create([
            'file_id' => $file->id,
            'token' => 'failure-category-share-token',
            'expires_at' => null,
            'password' => null,
            'download_count' => 0,
        ]);

        $this->assertNotNull(ShareLink::query()->where('token', 'failure-category-share-token')->first());

        $this->assertSame($file->id, $shareLink->file_id);

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

        $inProgressManifest->failure_category = 'physical_local_files';
        $inProgressManifest->save();

        $persistedManifest = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($persistedManifest);

        $this->assertSame('in_progress', $persistedManifest->status);
        $this->assertSame('pending', $persistedManifest->category_states['share_links']);
        $this->assertSame(1, (int) $persistedManifest->attempt_count);
        $this->assertNull($persistedManifest->completed_at);
        $this->assertSame('physical_local_files', $persistedManifest->failure_category);

        $operationId = $persistedManifest->operation_id;
        $subjectUserId = $persistedManifest->subject_user_id;
        $ownershipSnapshot = $persistedManifest->ownership_snapshot;
        $categoryStates = $persistedManifest->category_states;
        $status = $persistedManifest->status;
        $attemptCount = $persistedManifest->attempt_count;
        $lastAttemptAt = $persistedManifest->last_attempt_at;
        $completedAt = $persistedManifest->completed_at;
        $failureCategory = $persistedManifest->failure_category;
        $createdAt = $persistedManifest->created_at;
        $updatedAt = $persistedManifest->updated_at;

        $cleanupService = app(AccountDeleteShareLinksCleanupService::class);

        $deletedCount = $cleanupService->cleanup($persistedManifest);

        $this->assertSame(0, $deletedCount);

        $preservedShareLink = ShareLink::query()->where('token', 'failure-category-share-token')->first();
        $this->assertNotNull($preservedShareLink);
        $this->assertSame($file->id, $preservedShareLink->file_id);

        $this->assertNotNull(User::query()->find($subjectUser->id));

        $fileAfter = File::query()->find($file->id);
        $this->assertNotNull($fileAfter);
        $this->assertSame($subjectUser->id, $fileAfter->user_id);
        $this->assertSame('nimbusdrive/share-cleanup-failure-category.bin', $fileAfter->path);

        $afterManifest = AccountDeleteCleanupManifest::query()->find($persistedManifest->getKey());
        $this->assertNotNull($afterManifest);

        $this->assertSame('in_progress', $afterManifest->status);
        $this->assertSame(1, (int) $afterManifest->attempt_count);
        $this->assertSame('pending', $afterManifest->category_states['share_links']);
        $this->assertNull($afterManifest->completed_at);
        $this->assertSame('physical_local_files', $afterManifest->failure_category);

        $this->assertSame($operationId, $afterManifest->operation_id);
        $this->assertSame($subjectUserId, $afterManifest->subject_user_id);
        $this->assertSame($ownershipSnapshot, $afterManifest->ownership_snapshot);
        $this->assertSame($categoryStates, $afterManifest->category_states);
        $this->assertSame($status, $afterManifest->status);
        $this->assertSame($attemptCount, (int) $afterManifest->attempt_count);
        $this->assertTrue($lastAttemptAt->equalTo($afterManifest->last_attempt_at));
        $this->assertNull($afterManifest->completed_at);
        $this->assertSame($failureCategory, $afterManifest->failure_category);
        $this->assertTrue($createdAt->equalTo($afterManifest->created_at));
        $this->assertTrue($updatedAt->equalTo($afterManifest->updated_at));
    }
}

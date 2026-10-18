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

class AccountDeleteShareLinksCleanupCompletedCategoryTest extends TestCase
{
    use RefreshDatabase;

    public function test_share_links_cleanup_rejects_already_completed_category_without_deleting_links(): void
    {
        $subjectUser = User::factory()->create();

        $this->assertNotNull(User::query()->find($subjectUser->id));

        $file = File::create([
            'user_id' => $subjectUser->id,
            'folder_id' => null,
            'original_name' => 'share-cleanup-completed-category.bin',
            'stored_name' => 'share-cleanup-completed-category.bin',
            'path' => 'nimbusdrive/share-cleanup-completed-category.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 1,
        ]);

        $this->assertNotNull(File::query()->find($file->id));

        $shareLink = ShareLink::create([
            'file_id' => $file->id,
            'token' => 'completed-category-share-token',
            'expires_at' => null,
            'password' => null,
            'download_count' => 0,
        ]);

        $this->assertNotNull(ShareLink::query()->where('token', 'completed-category-share-token')->first());

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

        $markedCompleted = $manifestService->markCategoryCompleted(
            $inProgressManifest,
            'share_links',
        );

        $this->assertTrue($markedCompleted);

        $completedCategoryManifest = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($completedCategoryManifest);

        $this->assertSame('in_progress', $completedCategoryManifest->status);
        $this->assertSame(1, (int) $completedCategoryManifest->attempt_count);
        $this->assertSame('completed', $completedCategoryManifest->category_states['share_links']);
        $this->assertNull($completedCategoryManifest->completed_at);
        $this->assertNull($completedCategoryManifest->failure_category);

        $beforeOperationId = $completedCategoryManifest->operation_id;
        $beforeSubjectUserId = $completedCategoryManifest->subject_user_id;
        $beforeOwnershipSnapshot = $completedCategoryManifest->ownership_snapshot;
        $beforeCategoryStates = $completedCategoryManifest->category_states;
        $beforeStatus = $completedCategoryManifest->status;
        $beforeAttemptCount = $completedCategoryManifest->attempt_count;
        $beforeLastAttemptAt = $completedCategoryManifest->last_attempt_at;
        $beforeCompletedAt = $completedCategoryManifest->completed_at;
        $beforeFailureCategory = $completedCategoryManifest->failure_category;
        $beforeCreatedAt = $completedCategoryManifest->created_at;
        $beforeUpdatedAt = $completedCategoryManifest->updated_at;

        $cleanupService = app(AccountDeleteShareLinksCleanupService::class);

        $deletedCount = $cleanupService->cleanup($completedCategoryManifest);

        $this->assertSame(0, $deletedCount);

        $this->assertNotNull(ShareLink::query()->where('token', 'completed-category-share-token')->first());

        $this->assertNotNull(User::query()->find($subjectUser->id));

        $fileAfter = File::query()->find($file->id);
        $this->assertNotNull($fileAfter);
        $this->assertSame($subjectUser->id, $fileAfter->user_id);
        $this->assertSame('nimbusdrive/share-cleanup-completed-category.bin', $fileAfter->path);

        $afterManifest = AccountDeleteCleanupManifest::query()->find($completedCategoryManifest->getKey());
        $this->assertNotNull($afterManifest);

        $this->assertSame($beforeOperationId, $afterManifest->operation_id);
        $this->assertSame($beforeSubjectUserId, $afterManifest->subject_user_id);
        $this->assertSame($beforeOwnershipSnapshot, $afterManifest->ownership_snapshot);
        $this->assertSame($beforeCategoryStates, $afterManifest->category_states);
        $this->assertSame($beforeStatus, $afterManifest->status);
        $this->assertSame($beforeAttemptCount, (int) $afterManifest->attempt_count);
        $this->assertTrue($beforeLastAttemptAt->equalTo($afterManifest->last_attempt_at));
        $this->assertNull($afterManifest->completed_at);
        $this->assertNull($afterManifest->failure_category);

        $this->assertTrue($beforeCreatedAt->equalTo($afterManifest->created_at));
        $this->assertTrue($beforeUpdatedAt->equalTo($afterManifest->updated_at));

        $this->assertSame('in_progress', $afterManifest->status);
        $this->assertSame('completed', $afterManifest->category_states['share_links']);
        $this->assertNull($afterManifest->completed_at);
        $this->assertNull($afterManifest->failure_category);
    }
}

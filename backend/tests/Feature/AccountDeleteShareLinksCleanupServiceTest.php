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

class AccountDeleteShareLinksCleanupServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_share_links_cleanup_hard_deletes_only_subject_user_links_and_is_idempotent(): void
    {

        $subjectUser = User::factory()->create();
        $otherUser = User::factory()->create();

        $subjectActiveFile = File::create([
            'user_id' => $subjectUser->id,
            'folder_id' => null,
            'original_name' => 'share-cleanup-subject-active.bin',
            'stored_name' => 'share-cleanup-subject-active.bin',
            'path' => 'nimbusdrive/share-cleanup-subject-active.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 10,
        ]);

        $subjectTrashedFile = File::create([
            'user_id' => $subjectUser->id,
            'folder_id' => null,
            'original_name' => 'share-cleanup-subject-trashed.bin',
            'stored_name' => 'share-cleanup-subject-trashed.bin',
            'path' => 'nimbusdrive/share-cleanup-subject-trashed.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 11,
        ]);

        $subjectTrashedFile->delete();

        $otherUserFile = File::create([
            'user_id' => $otherUser->id,
            'folder_id' => null,
            'original_name' => 'share-cleanup-other-user.bin',
            'stored_name' => 'share-cleanup-other-user.bin',
            'path' => 'nimbusdrive/share-cleanup-other-user.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 12,
        ]);

        $this->assertNotNull(File::query()->find($subjectActiveFile->id));

        $trashedLookup = File::query()->withTrashed()->find($subjectTrashedFile->id);
        $this->assertNotNull($trashedLookup);
        $this->assertNotNull($trashedLookup->deleted_at);

        $this->assertNotNull(File::query()->find($otherUserFile->id));

        $subjectActiveToken = 'subject-active-share-token';
        $subjectTrashedToken = 'subject-trashed-share-token';
        $otherUserToken = 'other-user-share-token';

        $subjectActiveShare = ShareLink::create([
            'file_id' => $subjectActiveFile->id,
            'token' => $subjectActiveToken,
            'expires_at' => null,
            'password' => null,
            'download_count' => 0,
        ]);

        $subjectTrashedShare = ShareLink::create([
            'file_id' => $subjectTrashedFile->id,
            'token' => $subjectTrashedToken,
            'expires_at' => null,
            'password' => null,
            'download_count' => 0,
        ]);

        $otherUserShare = ShareLink::create([
            'file_id' => $otherUserFile->id,
            'token' => $otherUserToken,
            'expires_at' => null,
            'password' => null,
            'download_count' => 0,
        ]);

        $this->assertNotNull(ShareLink::query()->where('token', $subjectActiveToken)->first());
        $this->assertNotNull(ShareLink::query()->where('token', $subjectTrashedToken)->first());
        $this->assertNotNull(ShareLink::query()->where('token', $otherUserToken)->first());

        $manifestService = app(AccountDeleteCleanupManifestService::class);

        $manifest = $manifestService->createForUser($subjectUser);

        $started = $manifestService->beginAttempt($manifest);
        $this->assertTrue($started);

        $reloadedManifest = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($reloadedManifest);

        $this->assertSame('in_progress', $reloadedManifest->status);
        $this->assertSame(1, (int) $reloadedManifest->attempt_count);
        $this->assertNull($reloadedManifest->completed_at);
        $this->assertNull($reloadedManifest->failure_category);

        $this->assertIsArray($reloadedManifest->category_states);
        $this->assertArrayHasKey('share_links', $reloadedManifest->category_states);
        $this->assertSame('pending', $reloadedManifest->category_states['share_links']);

        $operationId = $reloadedManifest->operation_id;
        $subjectUserId = $reloadedManifest->subject_user_id;
        $ownershipSnapshot = $reloadedManifest->ownership_snapshot;
        $categoryStates = $reloadedManifest->category_states;
        $status = $reloadedManifest->status;
        $attemptCount = $reloadedManifest->attempt_count;
        $lastAttemptAt = $reloadedManifest->last_attempt_at;
        $completedAt = $reloadedManifest->completed_at;
        $failureCategory = $reloadedManifest->failure_category;
        $createdAt = $reloadedManifest->created_at;
        $updatedAt = $reloadedManifest->updated_at;

        $cleanupService = app(AccountDeleteShareLinksCleanupService::class);

        $deletedCount = $cleanupService->cleanup($reloadedManifest);
        $this->assertSame(2, $deletedCount);

        $this->assertNull(ShareLink::query()->where('token', $subjectActiveToken)->first());
        $this->assertNull(ShareLink::query()->where('token', $subjectTrashedToken)->first());
        $this->assertNotNull(ShareLink::query()->where('token', $otherUserToken)->first());

        $subjectActiveFileAfter = File::query()->find($subjectActiveFile->id);
        $this->assertNotNull($subjectActiveFileAfter);
        $this->assertSame($subjectUser->id, $subjectActiveFileAfter->user_id);
        $this->assertSame('nimbusdrive/share-cleanup-subject-active.bin', $subjectActiveFileAfter->path);

        $subjectTrashedFileAfter = File::query()->withTrashed()->find($subjectTrashedFile->id);
        $this->assertNotNull($subjectTrashedFileAfter);
        $this->assertSame($subjectUser->id, $subjectTrashedFileAfter->user_id);
        $this->assertSame('nimbusdrive/share-cleanup-subject-trashed.bin', $subjectTrashedFileAfter->path);
        $this->assertNotNull($subjectTrashedFileAfter->deleted_at);

        $otherUserFileAfter = File::query()->find($otherUserFile->id);
        $this->assertNotNull($otherUserFileAfter);
        $this->assertSame($otherUser->id, $otherUserFileAfter->user_id);
        $this->assertSame('nimbusdrive/share-cleanup-other-user.bin', $otherUserFileAfter->path);

        $this->assertNotNull(User::query()->find($subjectUser->id));
        $this->assertNotNull(User::query()->find($otherUser->id));

        $afterManifest = AccountDeleteCleanupManifest::query()->find($reloadedManifest->getKey());
        $this->assertNotNull($afterManifest);

        $this->assertSame('in_progress', $afterManifest->status);
        $this->assertIsArray($afterManifest->category_states);
        $this->assertSame('pending', $afterManifest->category_states['share_links']);
        $this->assertSame(1, (int) $afterManifest->attempt_count);
        $this->assertNull($afterManifest->completed_at);
        $this->assertNull($afterManifest->failure_category);

        $this->assertTrue($operationId === $afterManifest->operation_id);
        $this->assertTrue($subjectUserId === $afterManifest->subject_user_id);
        $this->assertSame($ownershipSnapshot, $afterManifest->ownership_snapshot);
        $this->assertSame($categoryStates, $afterManifest->category_states);
        $this->assertSame($status, $afterManifest->status);
        $this->assertTrue($attemptCount === $afterManifest->attempt_count);
        $this->assertTrue($lastAttemptAt->equalTo($afterManifest->last_attempt_at));
        $this->assertSame($completedAt, $afterManifest->completed_at);
        $this->assertSame($failureCategory, $afterManifest->failure_category);
        $this->assertTrue($createdAt->equalTo($afterManifest->created_at));
        $this->assertTrue($updatedAt->equalTo($afterManifest->updated_at));

        $secondDeletedCount = $cleanupService->cleanup(
            AccountDeleteCleanupManifest::query()->find($afterManifest->getKey()),
        );
        $this->assertSame(0, $secondDeletedCount);

        $this->assertNull(ShareLink::query()->where('token', $subjectActiveToken)->first());
        $this->assertNull(ShareLink::query()->where('token', $subjectTrashedToken)->first());
        $this->assertNotNull(ShareLink::query()->where('token', $otherUserToken)->first());

        $this->assertNotNull(User::query()->find($subjectUser->id));
        $this->assertNotNull(User::query()->find($otherUser->id));

        $finalManifest = AccountDeleteCleanupManifest::query()->find($afterManifest->getKey());
        $this->assertNotNull($finalManifest);

        $this->assertSame('in_progress', $finalManifest->status);
        $this->assertIsArray($finalManifest->category_states);
        $this->assertSame('pending', $finalManifest->category_states['share_links']);

        $this->assertSame(1, (int) $finalManifest->attempt_count);
        $this->assertNull($finalManifest->completed_at);
        $this->assertNull($finalManifest->failure_category);

        $this->assertTrue($operationId === $finalManifest->operation_id);
        $this->assertTrue($subjectUserId === $finalManifest->subject_user_id);
        $this->assertSame($ownershipSnapshot, $finalManifest->ownership_snapshot);
        $this->assertSame($categoryStates, $finalManifest->category_states);
        $this->assertSame($status, $finalManifest->status);
        $this->assertTrue($attemptCount === $finalManifest->attempt_count);
        $this->assertTrue($lastAttemptAt->equalTo($finalManifest->last_attempt_at));
        $this->assertSame($completedAt, $finalManifest->completed_at);
        $this->assertSame($failureCategory, $finalManifest->failure_category);
        $this->assertTrue($createdAt->equalTo($finalManifest->created_at));
        $this->assertTrue($updatedAt->equalTo($finalManifest->updated_at));
    }
}

<?php

namespace Tests\Feature;

use App\Models\AccountDeleteCleanupManifest;
use App\Models\File;
use App\Models\ShareLink;
use App\Models\User;
use App\Services\AccountDeleteCleanupManifestService;
use App\Services\AccountDeleteShareLinksCleanupOrchestrator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AccountDeleteShareLinksCleanupOrchestratorTest extends TestCase
{
    use RefreshDatabase;

    public function test_orchestrator_cleans_subject_share_links_and_marks_category_completed(): void
    {
        $subjectUser = User::factory()->create();
        $otherUser = User::factory()->create();

        $subjectUserId = $subjectUser->id;
        $otherUserId = $otherUser->id;

        $subjectActiveFile = File::create([
            'user_id' => $subjectUserId,
            'folder_id' => null,
            'original_name' => 'share-orchestrator-subject-active.bin',
            'stored_name' => 'share-orchestrator-subject-active.bin',
            'path' => 'nimbusdrive/share-orchestrator-subject-active.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 1,
        ]);

        $subjectTrashedFile = File::create([
            'user_id' => $subjectUserId,
            'folder_id' => null,
            'original_name' => 'share-orchestrator-subject-trashed.bin',
            'stored_name' => 'share-orchestrator-subject-trashed.bin',
            'path' => 'nimbusdrive/share-orchestrator-subject-trashed.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 1,
        ]);

        $subjectTrashedFile->delete();

        $otherUserFile = File::create([
            'user_id' => $otherUserId,
            'folder_id' => null,
            'original_name' => 'share-orchestrator-other-user.bin',
            'stored_name' => 'share-orchestrator-other-user.bin',
            'path' => 'nimbusdrive/share-orchestrator-other-user.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 1,
        ]);

        $subjectActiveToken = 'share-orchestrator-subject-active-token';
        $subjectTrashedToken = 'share-orchestrator-subject-trashed-token';
        $otherUserToken = 'share-orchestrator-other-user-token';

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

        $inProgressManifest = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($inProgressManifest);

        $this->assertSame('in_progress', $inProgressManifest->status);
        $this->assertSame(1, (int) $inProgressManifest->attempt_count);
        $this->assertNull($inProgressManifest->completed_at);
        $this->assertNull($inProgressManifest->failure_category);
        $this->assertSame('pending', $inProgressManifest->category_states['share_links']);

        foreach (
            [
                'database_records',
                'physical_local_files',
                'devices',
                'oauth_identities',
                'sanctum_tokens',
                'google_drive_credentials',
                'activity_logs',
                'user_record',
                'other_user_owned_resources',
            ] as $category
        ) {
            $this->assertSame('pending', $inProgressManifest->category_states[$category]);
        }

        $operationId = $inProgressManifest->operation_id;
        $subjectUserIdCaptured = $inProgressManifest->subject_user_id;
        $ownershipSnapshot = $inProgressManifest->ownership_snapshot;
        $status = $inProgressManifest->status;
        $attemptCount = $inProgressManifest->attempt_count;
        $lastAttemptAt = $inProgressManifest->last_attempt_at;
        $completedAt = $inProgressManifest->completed_at;
        $failureCategory = $inProgressManifest->failure_category;
        $createdAt = $inProgressManifest->created_at;

        $orchestrator = app(AccountDeleteShareLinksCleanupOrchestrator::class);

        $executed = $orchestrator->execute($inProgressManifest);

        $this->assertTrue($executed);

        $this->assertNull(ShareLink::query()->where('token', $subjectActiveToken)->first());
        $this->assertNull(ShareLink::query()->where('token', $subjectTrashedToken)->first());
        $this->assertNotNull(ShareLink::query()->where('token', $otherUserToken)->first());

        $subjectActiveFileAfter = File::query()->find($subjectActiveFile->id);
        $subjectTrashedFileAfter = File::query()->withTrashed()->find($subjectTrashedFile->id);
        $otherUserFileAfter = File::query()->find($otherUserFile->id);

        $this->assertNotNull($subjectActiveFileAfter);
        $this->assertNotNull($subjectTrashedFileAfter);
        $this->assertNotNull($otherUserFileAfter);

        $this->assertSame($subjectUserIdCaptured, $subjectActiveFileAfter->user_id);
        $this->assertSame('nimbusdrive/share-orchestrator-subject-active.bin', $subjectActiveFileAfter->path);

        $this->assertSame($subjectUserIdCaptured, $subjectTrashedFileAfter->user_id);
        $this->assertSame('nimbusdrive/share-orchestrator-subject-trashed.bin', $subjectTrashedFileAfter->path);
        $this->assertNotNull($subjectTrashedFileAfter->deleted_at);

        $this->assertSame($otherUserId, $otherUserFileAfter->user_id);
        $this->assertSame('nimbusdrive/share-orchestrator-other-user.bin', $otherUserFileAfter->path);

        $this->assertNotNull(User::query()->find($subjectUserId));
        $this->assertNotNull(User::query()->find($otherUserId));

        $afterManifest = AccountDeleteCleanupManifest::query()->find($inProgressManifest->getKey());
        $this->assertNotNull($afterManifest);

        $this->assertSame('in_progress', $afterManifest->status);
        $this->assertSame(1, (int) $afterManifest->attempt_count);
        $this->assertNull($afterManifest->completed_at);
        $this->assertNull($afterManifest->failure_category);
        $this->assertSame('completed', $afterManifest->category_states['share_links']);

        foreach (
            [
                'database_records',
                'physical_local_files',
                'devices',
                'oauth_identities',
                'sanctum_tokens',
                'google_drive_credentials',
                'activity_logs',
                'user_record',
                'other_user_owned_resources',
            ] as $category
        ) {
            $this->assertSame('pending', $afterManifest->category_states[$category]);
        }

        $this->assertSame($operationId, $afterManifest->operation_id);
        $this->assertSame($subjectUserIdCaptured, $afterManifest->subject_user_id);
        $this->assertSame($ownershipSnapshot, $afterManifest->ownership_snapshot);
        $this->assertSame($status, $afterManifest->status);
        $this->assertSame($attemptCount, (int) $afterManifest->attempt_count);
        $this->assertTrue($lastAttemptAt->equalTo($afterManifest->last_attempt_at));
        $this->assertTrue($createdAt->equalTo($afterManifest->created_at));
        $this->assertNull($afterManifest->completed_at);
        $this->assertNull($afterManifest->failure_category);
    }
}

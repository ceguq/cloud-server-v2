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

class AccountDeleteShareLinksCleanupOrchestratorPendingManifestTest extends TestCase
{
    use RefreshDatabase;

    public function test_orchestrator_rejects_pending_manifest_without_cleanup_or_bookkeeping(): void
    {
        $subjectUser = User::factory()->create();
        $subjectUserId = $subjectUser->id;

        $this->assertNotNull(User::query()->find($subjectUserId));

        $file = File::create([
            'user_id' => $subjectUserId,
            'folder_id' => null,
            'original_name' => 'share-orchestrator-pending-manifest.bin',
            'stored_name' => 'share-orchestrator-pending-manifest.bin',
            'path' => 'nimbusdrive/share-orchestrator-pending-manifest.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 1,
        ]);

        $this->assertNotNull(File::query()->find($file->id));

        $shareLink = ShareLink::create([
            'file_id' => $file->id,
            'token' => 'share-orchestrator-pending-manifest-token',
            'expires_at' => null,
            'password' => null,
            'download_count' => 0,
        ]);

        $this->assertNotNull(ShareLink::query()->where('token', 'share-orchestrator-pending-manifest-token')->first());

        $this->assertSame($file->id, $shareLink->file_id);

        $manifestService = app(AccountDeleteCleanupManifestService::class);

        $pendingManifest = $manifestService->createForUser($subjectUser);

        $this->assertSame('pending', $pendingManifest->status);
        $this->assertSame(0, (int) $pendingManifest->attempt_count);
        $this->assertNull($pendingManifest->last_attempt_at);
        $this->assertNull($pendingManifest->completed_at);
        $this->assertNull($pendingManifest->failure_category);
        $this->assertSame('pending', $pendingManifest->category_states['share_links']);

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
            $this->assertSame('pending', $pendingManifest->category_states[$category]);
        }

        $operationId = $pendingManifest->operation_id;
        $subjectUserIdCaptured = $pendingManifest->subject_user_id;
        $ownershipSnapshot = $pendingManifest->ownership_snapshot;
        $categoryStates = $pendingManifest->category_states;
        $status = $pendingManifest->status;
        $attemptCount = $pendingManifest->attempt_count;
        $lastAttemptAt = $pendingManifest->last_attempt_at;
        $completedAt = $pendingManifest->completed_at;
        $failureCategory = $pendingManifest->failure_category;
        $createdAt = $pendingManifest->created_at;
        $updatedAt = $pendingManifest->updated_at;

        $orchestrator = app(AccountDeleteShareLinksCleanupOrchestrator::class);

        $executed = $orchestrator->execute($pendingManifest);

        $this->assertFalse($executed);

        $this->assertNotNull(
            ShareLink::query()->where('token', 'share-orchestrator-pending-manifest-token')->first(),
        );

        $this->assertNotNull(User::query()->find($subjectUserIdCaptured));

        $fileAfter = File::query()->find($file->id);
        $this->assertNotNull($fileAfter);
        $this->assertSame($subjectUserIdCaptured, $fileAfter->user_id);
        $this->assertSame('nimbusdrive/share-orchestrator-pending-manifest.bin', $fileAfter->path);

        $afterManifest = AccountDeleteCleanupManifest::query()->find($pendingManifest->getKey());
        $this->assertNotNull($afterManifest);

        $this->assertSame($operationId, $afterManifest->operation_id);
        $this->assertSame($subjectUserIdCaptured, $afterManifest->subject_user_id);
        $this->assertSame($ownershipSnapshot, $afterManifest->ownership_snapshot);
        $this->assertSame($categoryStates, $afterManifest->category_states);
        $this->assertSame($status, $afterManifest->status);
        $this->assertSame($attemptCount, (int) $afterManifest->attempt_count);
        $this->assertNull($afterManifest->last_attempt_at);
        $this->assertNull($afterManifest->completed_at);
        $this->assertNull($afterManifest->failure_category);

        $this->assertTrue($createdAt->equalTo($afterManifest->created_at));
        $this->assertTrue($updatedAt->equalTo($afterManifest->updated_at));

        $this->assertSame('pending', $afterManifest->category_states['share_links']);
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
    }
}

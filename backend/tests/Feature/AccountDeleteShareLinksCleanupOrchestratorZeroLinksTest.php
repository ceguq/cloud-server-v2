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

class AccountDeleteShareLinksCleanupOrchestratorZeroLinksTest extends TestCase
{
    use RefreshDatabase;

    public function test_orchestrator_marks_share_links_completed_when_eligible_subject_has_no_links(): void
    {
        $subjectUser = User::factory()->create();
        $subjectUserId = $subjectUser->id;

        $this->assertNotNull(User::query()->find($subjectUserId));

        $subjectFile = File::create([
            'user_id' => $subjectUserId,
            'folder_id' => null,
            'original_name' => 'share-orchestrator-zero-links.bin',
            'stored_name' => 'share-orchestrator-zero-links.bin',
            'path' => 'nimbusdrive/share-orchestrator-zero-links.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 1,
        ]);

        $this->assertNotNull(File::query()->find($subjectFile->id));
        $this->assertSame(0, ShareLink::query()->where('file_id', $subjectFile->id)->count());

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

        $this->assertSame(
            0,
            ShareLink::query()->where('file_id', $subjectFile->id)->count(),
        );

        $this->assertNotNull(User::query()->find($subjectUserId));

        $fileAfter = File::query()->find($subjectFile->id);
        $this->assertNotNull($fileAfter);
        $this->assertSame($subjectUserId, $fileAfter->user_id);
        $this->assertSame('nimbusdrive/share-orchestrator-zero-links.bin', $fileAfter->path);

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
        $this->assertSame($subjectUserId, $afterManifest->subject_user_id);
        $this->assertSame($ownershipSnapshot, $afterManifest->ownership_snapshot);
        $this->assertSame($status, $afterManifest->status);
        $this->assertSame($attemptCount, (int) $afterManifest->attempt_count);
        $this->assertTrue($lastAttemptAt->equalTo($afterManifest->last_attempt_at));
        $this->assertTrue($createdAt->equalTo($afterManifest->created_at));
        $this->assertNull($afterManifest->completed_at);
        $this->assertNull($afterManifest->failure_category);
        $this->assertSame($completedAt, $afterManifest->completed_at);
    }
}

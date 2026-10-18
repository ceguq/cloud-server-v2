<?php

namespace Tests\Feature;

use App\Models\AccountDeleteCleanupManifest;
use App\Models\File;
use App\Models\ShareLink;
use App\Models\User;
use App\Services\AccountDeleteCleanupCategoryExecutionResult;
use App\Services\AccountDeleteCleanupManifestService;
use App\Services\AccountDeleteShareLinksCleanupOrchestrator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AccountDeleteShareLinksCleanupOrchestratorRejectedResultTest extends TestCase
{
    use RefreshDatabase;

    public function test_execute_with_result_returns_rejected_for_pending_manifest_without_cleanup_or_bookkeeping(): void
    {
        $subjectUser = User::factory()->create();
        $protectedUser = User::factory()->create();

        $subjectToken = $subjectUser->createToken('account-delete-share-links-rejected-subject');
        $protectedToken = $protectedUser->createToken('account-delete-share-links-rejected-protected');

        $this->assertNotNull($subjectToken);
        $this->assertNotNull($protectedToken);

        $this->assertNotNull(User::query()->find($subjectUser->id));
        $this->assertNotNull(User::query()->find($protectedUser->id));

        $subjectFileA = File::create([
            'user_id' => $subjectUser->id,
            'folder_id' => null,
            'original_name' => 'share-links-rejected-a.bin',
            'stored_name' => 'share-links-rejected-a.bin',
            'path' => 'nimbusdrive/share-links-rejected-a.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 1,
        ]);

        $subjectFileB = File::create([
            'user_id' => $subjectUser->id,
            'folder_id' => null,
            'original_name' => 'share-links-rejected-b.bin',
            'stored_name' => 'share-links-rejected-b.bin',
            'path' => 'nimbusdrive/share-links-rejected-b.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 2,
        ]);

        $protectedFile = File::create([
            'user_id' => $protectedUser->id,
            'folder_id' => null,
            'original_name' => 'share-links-rejected-protected.bin',
            'stored_name' => 'share-links-rejected-protected.bin',
            'path' => 'nimbusdrive/share-links-rejected-protected.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 3,
        ]);

        $subjectShareA = ShareLink::create([
            'file_id' => $subjectFileA->id,
            'token' => 'share-links-rejected-subject-a-token',
            'expires_at' => null,
            'password' => null,
            'download_count' => 0,
        ]);

        $subjectShareB = ShareLink::create([
            'file_id' => $subjectFileB->id,
            'token' => 'share-links-rejected-subject-b-token',
            'expires_at' => null,
            'password' => null,
            'download_count' => 0,
        ]);

        $protectedShare = ShareLink::create([
            'file_id' => $protectedFile->id,
            'token' => 'share-links-rejected-protected-token',
            'expires_at' => null,
            'password' => null,
            'download_count' => 5,
        ]);

        $this->assertNotNull(ShareLink::query()->find($subjectShareA->id));
        $this->assertNotNull(ShareLink::query()->find($subjectShareB->id));
        $this->assertNotNull(ShareLink::query()->find($protectedShare->id));

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

        $baseline = [
            'operation_id' => $pendingManifest->operation_id,
            'subject_user_id' => $pendingManifest->subject_user_id,
            'ownership_snapshot' => $pendingManifest->ownership_snapshot,
            'category_states' => $pendingManifest->category_states,
            'status' => $pendingManifest->status,
            'attempt_count' => $pendingManifest->attempt_count,
            'last_attempt_at' => $pendingManifest->last_attempt_at,
            'completed_at' => $pendingManifest->completed_at,
            'failure_category' => $pendingManifest->failure_category,
            'created_at' => $pendingManifest->created_at,
            'updated_at' => $pendingManifest->updated_at,
        ];

        $orchestrator = app(AccountDeleteShareLinksCleanupOrchestrator::class);

        $result = $orchestrator->executeWithResult(
            $pendingManifest,
        );

        $this->assertInstanceOf(AccountDeleteCleanupCategoryExecutionResult::class, $result);

        $this->assertSame('share_links', $result->category);
        $this->assertSame(AccountDeleteCleanupCategoryExecutionResult::OUTCOME_REJECTED, $result->outcome);
        $this->assertSame(false, $result->cleanupExecuted);
        $this->assertSame(false, $result->categoryCompleted);

        // Share links must remain.
        $this->assertNotNull(ShareLink::query()->find($subjectShareA->id));
        $this->assertNotNull(ShareLink::query()->find($subjectShareB->id));
        $this->assertNotNull(ShareLink::query()->find($protectedShare->id));

        $protectedShareAfter = ShareLink::query()->find($protectedShare->id);
        $this->assertNotNull($protectedShareAfter);
        $this->assertSame($protectedShare->token, $protectedShareAfter->token);
        $this->assertSame($protectedShare->file_id, $protectedShareAfter->file_id);
        $this->assertSame($protectedShare->expires_at, $protectedShareAfter->expires_at);
        $this->assertSame($protectedShare->password, $protectedShareAfter->password);
        $this->assertSame($protectedShare->download_count, $protectedShareAfter->download_count);

        $afterManifest = AccountDeleteCleanupManifest::query()->find($pendingManifest->getKey());
        $this->assertNotNull($afterManifest);

        $this->assertEquals($baseline['operation_id'], $afterManifest->operation_id);
        $this->assertSame($baseline['subject_user_id'], $afterManifest->subject_user_id);
        $this->assertEquals($baseline['ownership_snapshot'], $afterManifest->ownership_snapshot);
        $this->assertEquals($baseline['category_states'], $afterManifest->category_states);
        $this->assertSame($baseline['status'], $afterManifest->status);
        $this->assertSame($baseline['attempt_count'], (int) $afterManifest->attempt_count);
        $this->assertEquals($baseline['last_attempt_at'], $afterManifest->last_attempt_at);
        $this->assertEquals($baseline['completed_at'], $afterManifest->completed_at);
        $this->assertSame($baseline['failure_category'], $afterManifest->failure_category);
        $this->assertEquals($baseline['created_at'], $afterManifest->created_at);
        $this->assertEquals($baseline['updated_at'], $afterManifest->updated_at);
    }
}

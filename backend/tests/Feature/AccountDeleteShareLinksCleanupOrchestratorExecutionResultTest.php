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
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class AccountDeleteShareLinksCleanupOrchestratorExecutionResultTest extends TestCase
{
    use RefreshDatabase;

    public function test_execute_with_result_returns_completed_result_after_share_links_cleanup_and_bookkeeping(): void
    {
        $subjectUser = User::factory()->create();
        $protectedUser = User::factory()->create();

        $this->assertNotNull(User::query()->find($subjectUser->id));
        $this->assertNotNull(User::query()->find($protectedUser->id));

        $subjectToken = $subjectUser->createToken('account-delete-share-links-test');
        $protectedToken = $protectedUser->createToken('account-delete-share-links-protected-test');

        $this->assertNotNull($subjectToken);
        $this->assertNotNull($protectedToken);

        // Required File ownership fixtures.
        $subjectFileA = File::create([
            'user_id' => $subjectUser->id,
            'folder_id' => null,
            'original_name' => 'share-links-result-a.bin',
            'stored_name' => 'share-links-result-a.bin',
            'path' => 'nimbusdrive/share-links-result-a.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 10,
        ]);

        $subjectFileB = File::create([
            'user_id' => $subjectUser->id,
            'folder_id' => null,
            'original_name' => 'share-links-result-b.bin',
            'stored_name' => 'share-links-result-b.bin',
            'path' => 'nimbusdrive/share-links-result-b.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 11,
        ]);

        $protectedFile = File::create([
            'user_id' => $protectedUser->id,
            'folder_id' => null,
            'original_name' => 'share-links-result-protected.bin',
            'stored_name' => 'share-links-result-protected.bin',
            'path' => 'nimbusdrive/share-links-result-protected.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 12,
        ]);

        $this->assertNotNull(File::query()->find($subjectFileA->id));
        $this->assertNotNull(File::query()->find($subjectFileB->id));
        $this->assertNotNull(File::query()->find($protectedFile->id));

        $subjectShare1 = ShareLink::create([
            'file_id' => $subjectFileA->id,
            'token' => 'share-links-result-subject-1-token',
            'expires_at' => null,
            'password' => null,
            'download_count' => 0,
        ]);

        $subjectShare2 = ShareLink::create([
            'file_id' => $subjectFileB->id,
            'token' => 'share-links-result-subject-2-token',
            'expires_at' => null,
            'password' => null,
            'download_count' => 0,
        ]);

        $protectedShare = ShareLink::create([
            'file_id' => $protectedFile->id,
            'token' => 'share-links-result-protected-token',
            'expires_at' => null,
            'password' => null,
            'download_count' => 7,
        ]);

        $this->assertNotNull(ShareLink::query()->where('token', $subjectShare1->token)->first());
        $this->assertNotNull(ShareLink::query()->where('token', $subjectShare2->token)->first());
        $this->assertNotNull(ShareLink::query()->where('token', $protectedShare->token)->first());

        $protectedShareCaptured = [
            'file_id' => $protectedShare->file_id,
            'token' => $protectedShare->token,
            'expires_at' => $protectedShare->expires_at,
            'password' => $protectedShare->password,
            'download_count' => $protectedShare->download_count,
        ];

        $manifestService = app(AccountDeleteCleanupManifestService::class);

        $manifest = $manifestService->createForUser($subjectUser);

        $started = $manifestService->beginAttempt($manifest);
        $this->assertTrue($started);

        $inProgressManifest = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($inProgressManifest);

        $this->assertSame('in_progress', $inProgressManifest->status);
        $this->assertSame(1, $inProgressManifest->attempt_count);
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

        $orchestrator = app(AccountDeleteShareLinksCleanupOrchestrator::class);

        $result = $orchestrator->executeWithResult(
            $inProgressManifest,
        );

        // Expected RED reason: missing production method.
        $this->assertInstanceOf(AccountDeleteCleanupCategoryExecutionResult::class, $result);
        $this->assertSame('share_links', $result->category);
        $this->assertSame(AccountDeleteCleanupCategoryExecutionResult::OUTCOME_COMPLETED, $result->outcome);
        $this->assertTrue($result->cleanupExecuted);
        $this->assertTrue($result->categoryCompleted);

        // Resource assertions (executed only when production exists).
        $this->assertNull(ShareLink::query()->find($subjectShare1->id));
        $this->assertNull(ShareLink::query()->find($subjectShare2->id));

        $protectedShareAfter = ShareLink::query()->find($protectedShare->id);
        $this->assertNotNull($protectedShareAfter);
        $this->assertSame($protectedShareCaptured['file_id'], $protectedShareAfter->file_id);
        $this->assertSame($protectedShareCaptured['token'], $protectedShareAfter->token);
        $this->assertSame($protectedShareCaptured['expires_at'], $protectedShareAfter->expires_at);
        $this->assertSame($protectedShareCaptured['password'], $protectedShareAfter->password);
        $this->assertSame($protectedShareCaptured['download_count'], $protectedShareAfter->download_count);

        $this->assertNotNull(User::query()->find($subjectUser->id));
        $this->assertNotNull(User::query()->find($protectedUser->id));

        $afterManifest = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertSame('in_progress', $afterManifest->status);
        $this->assertSame(1, $afterManifest->attempt_count);
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

        // Ensure we don't call completeIfAllCategoriesCompleted()
        Cache::shouldReceive('store')->zeroOrMoreTimes();
    }
}

<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\AccountDeleteCleanupManifest;
use App\Models\File;
use App\Models\Folder;
use App\Models\User;
use App\Services\AccountDeleteCleanupCategoryExecutionResult;
use App\Services\AccountDeleteCleanupManifestService;
use App\Services\AccountDeleteDatabaseRecordsCleanupOrchestrator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class AccountDeleteDatabaseRecordsCleanupOrchestratorTest extends TestCase
{
    use RefreshDatabase;

    public function test_database_records_cleanup_orchestrator_completes_category_after_successful_cleanup(): void
    {
        $subjectUser = User::factory()->create();
        $secondUser = User::factory()->create();
        $subjectFolder = Folder::create([
            'name' => 'account-delete-database-orchestrator-subject-folder',
            'parent_id' => null,
            'user_id' => $subjectUser->id,
        ]);
        $subjectFile = File::create([
            'user_id' => $subjectUser->id,
            'folder_id' => null,
            'original_name' => 'account-delete-database-orchestrator-subject.bin',
            'stored_name' => 'account-delete-database-orchestrator-subject.bin',
            'path' => 'nimbusdrive/account-delete-database-orchestrator-subject.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 10,
        ]);
        $secondFolder = Folder::create([
            'name' => 'account-delete-database-orchestrator-second-folder',
            'parent_id' => null,
            'user_id' => $secondUser->id,
        ]);
        $secondFile = File::create([
            'user_id' => $secondUser->id,
            'folder_id' => null,
            'original_name' => 'account-delete-database-orchestrator-second.bin',
            'stored_name' => 'account-delete-database-orchestrator-second.bin',
            'path' => 'nimbusdrive/account-delete-database-orchestrator-second.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 11,
        ]);
        $subjectToken = $subjectUser->createToken('account-delete-database-orchestrator-subject');
        $secondUserToken = $secondUser->createToken('account-delete-database-orchestrator-second');

        $manifestService = app(AccountDeleteCleanupManifestService::class);
        $manifest = $manifestService->createForUser($subjectUser);
        $this->assertTrue($manifestService->beginAttempt($manifest));
        $inProgressManifest = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($inProgressManifest);
        $this->assertTrue($manifestService->markCategoryCompleted($inProgressManifest, 'share_links'));

        $eligibleManifest = $inProgressManifest->fresh();
        $this->assertNotNull($eligibleManifest);

        $result = app(AccountDeleteDatabaseRecordsCleanupOrchestrator::class)
            ->executeWithResult($eligibleManifest);

        $this->assertInstanceOf(AccountDeleteCleanupCategoryExecutionResult::class, $result);
        $this->assertSame('database_records', $result->category);
        $this->assertSame(AccountDeleteCleanupCategoryExecutionResult::OUTCOME_COMPLETED, $result->outcome);
        $this->assertTrue($result->cleanupExecuted);
        $this->assertTrue($result->categoryCompleted);
        $this->assertNull(File::withTrashed()->find($subjectFile->id));
        $this->assertNull(Folder::withTrashed()->find($subjectFolder->id));
        $this->assertNotNull(File::withTrashed()->find($secondFile->id));
        $this->assertNotNull(Folder::withTrashed()->find($secondFolder->id));
        $this->assertNotNull(User::query()->find($subjectUser->id));
        $this->assertNotNull(User::query()->find($secondUser->id));
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $subjectToken->accessToken->getKey()]);
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $secondUserToken->accessToken->getKey()]);

        $manifestAfterCleanup = $eligibleManifest->fresh();
        $this->assertNotNull($manifestAfterCleanup);
        $this->assertSame('in_progress', $manifestAfterCleanup->status);
        $this->assertSame('completed', $manifestAfterCleanup->category_states['share_links']);
        $this->assertSame('completed', $manifestAfterCleanup->category_states['database_records']);
        $this->assertNull($manifestAfterCleanup->completed_at);
        $this->assertNull($manifestAfterCleanup->failure_category);
    }
}

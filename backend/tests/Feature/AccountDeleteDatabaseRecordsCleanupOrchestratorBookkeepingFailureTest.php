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
use App\Services\AccountDeleteDatabaseRecordsCleanupService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\TestCase;

final class AccountDeleteDatabaseRecordsCleanupOrchestratorBookkeepingFailureTest extends TestCase
{
    use RefreshDatabase;

    public function test_database_records_cleanup_orchestrator_reports_bookkeeping_failure_after_cleanup(): void
    {
        $subjectUser = User::factory()->create();
        $secondUser = User::factory()->create();
        $subjectFolder = Folder::create([
            'name' => 'account-delete-database-bookkeeping-subject-folder',
            'parent_id' => null,
            'user_id' => $subjectUser->id,
        ]);
        $subjectFile = File::create([
            'user_id' => $subjectUser->id,
            'folder_id' => null,
            'original_name' => 'account-delete-database-bookkeeping-subject.bin',
            'stored_name' => 'account-delete-database-bookkeeping-subject.bin',
            'path' => 'nimbusdrive/account-delete-database-bookkeeping-subject.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 10,
        ]);
        $secondFolder = Folder::create([
            'name' => 'account-delete-database-bookkeeping-second-folder',
            'parent_id' => null,
            'user_id' => $secondUser->id,
        ]);
        $secondFile = File::create([
            'user_id' => $secondUser->id,
            'folder_id' => null,
            'original_name' => 'account-delete-database-bookkeeping-second.bin',
            'stored_name' => 'account-delete-database-bookkeeping-second.bin',
            'path' => 'nimbusdrive/account-delete-database-bookkeeping-second.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 11,
        ]);

        $realManifestService = app(AccountDeleteCleanupManifestService::class);
        $manifest = $realManifestService->createForUser($subjectUser);
        $this->assertTrue($realManifestService->beginAttempt($manifest));
        $inProgressManifest = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($inProgressManifest);
        $this->assertTrue($realManifestService->markCategoryCompleted($inProgressManifest, 'share_links'));
        $eligibleManifest = $inProgressManifest->fresh();
        $this->assertNotNull($eligibleManifest);

        $bookkeepingManifestService = Mockery::mock(AccountDeleteCleanupManifestService::class);
        $bookkeepingManifestService
            ->shouldReceive('markCategoryCompleted')
            ->once()
            ->with($eligibleManifest, 'database_records')
            ->andReturnFalse();

        $orchestrator = new AccountDeleteDatabaseRecordsCleanupOrchestrator(
            app(AccountDeleteDatabaseRecordsCleanupService::class),
            $bookkeepingManifestService,
        );
        $result = $orchestrator->executeWithResult($eligibleManifest);

        $this->assertInstanceOf(AccountDeleteCleanupCategoryExecutionResult::class, $result);
        $this->assertSame('database_records', $result->category);
        $this->assertSame(AccountDeleteCleanupCategoryExecutionResult::OUTCOME_BOOKKEEPING_FAILED, $result->outcome);
        $this->assertTrue($result->cleanupExecuted);
        $this->assertFalse($result->categoryCompleted);
        $this->assertNull(File::withTrashed()->find($subjectFile->id));
        $this->assertNull(Folder::withTrashed()->find($subjectFolder->id));
        $this->assertNotNull(File::withTrashed()->find($secondFile->id));
        $this->assertNotNull(Folder::withTrashed()->find($secondFolder->id));
        $this->assertNotNull(User::query()->find($subjectUser->id));
        $this->assertNotNull(User::query()->find($secondUser->id));

        $manifestAfterCleanup = $eligibleManifest->fresh();
        $this->assertNotNull($manifestAfterCleanup);
        $this->assertSame('in_progress', $manifestAfterCleanup->status);
        $this->assertSame('completed', $manifestAfterCleanup->category_states['share_links']);
        $this->assertSame('pending', $manifestAfterCleanup->category_states['database_records']);
        $this->assertNull($manifestAfterCleanup->completed_at);
        $this->assertNull($manifestAfterCleanup->failure_category);
    }
}

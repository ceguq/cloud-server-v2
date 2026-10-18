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

final class AccountDeleteDatabaseRecordsCleanupOrchestratorRejectedResultTest extends TestCase
{
    use RefreshDatabase;

    public function test_database_records_cleanup_orchestrator_returns_rejected_without_cleanup_or_bookkeeping(): void
    {
        $subjectUser = User::factory()->create();
        $secondUser = User::factory()->create();
        $subjectFolder = Folder::create([
            'name' => 'account-delete-database-orchestrator-rejected-subject-folder',
            'parent_id' => null,
            'user_id' => $subjectUser->id,
        ]);
        $subjectFile = File::create([
            'user_id' => $subjectUser->id,
            'folder_id' => null,
            'original_name' => 'account-delete-database-orchestrator-rejected-subject.bin',
            'stored_name' => 'account-delete-database-orchestrator-rejected-subject.bin',
            'path' => 'nimbusdrive/account-delete-database-orchestrator-rejected-subject.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 10,
        ]);
        $secondFolder = Folder::create([
            'name' => 'account-delete-database-orchestrator-rejected-second-folder',
            'parent_id' => null,
            'user_id' => $secondUser->id,
        ]);
        $secondFile = File::create([
            'user_id' => $secondUser->id,
            'folder_id' => null,
            'original_name' => 'account-delete-database-orchestrator-rejected-second.bin',
            'stored_name' => 'account-delete-database-orchestrator-rejected-second.bin',
            'path' => 'nimbusdrive/account-delete-database-orchestrator-rejected-second.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 11,
        ]);

        $manifest = app(AccountDeleteCleanupManifestService::class)
            ->createForUser($subjectUser);
        $categoryStates = $manifest->category_states;

        $result = app(AccountDeleteDatabaseRecordsCleanupOrchestrator::class)
            ->executeWithResult($manifest);

        $this->assertInstanceOf(AccountDeleteCleanupCategoryExecutionResult::class, $result);
        $this->assertSame('database_records', $result->category);
        $this->assertSame(AccountDeleteCleanupCategoryExecutionResult::OUTCOME_REJECTED, $result->outcome);
        $this->assertFalse($result->cleanupExecuted);
        $this->assertFalse($result->categoryCompleted);
        $this->assertNotNull(File::withTrashed()->find($subjectFile->id));
        $this->assertNotNull(Folder::withTrashed()->find($subjectFolder->id));
        $this->assertNotNull(File::withTrashed()->find($secondFile->id));
        $this->assertNotNull(Folder::withTrashed()->find($secondFolder->id));
        $this->assertNotNull(User::query()->find($subjectUser->id));
        $this->assertNotNull(User::query()->find($secondUser->id));

        $manifestAfterCleanup = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($manifestAfterCleanup);
        $this->assertSame('pending', $manifestAfterCleanup->status);
        $this->assertSame($categoryStates, $manifestAfterCleanup->category_states);
        $this->assertNull($manifestAfterCleanup->completed_at);
        $this->assertNull($manifestAfterCleanup->failure_category);
    }
}

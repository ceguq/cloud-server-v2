<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\AccountDeleteCleanupManifest;
use App\Models\File;
use App\Models\Folder;
use App\Models\User;
use App\Services\AccountDeleteCleanupManifestService;
use App\Services\AccountDeleteDatabaseRecordsCleanupOrchestrator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class AccountDeleteDatabaseRecordsCleanupOrchestratorLegacyExecuteTest extends TestCase
{
    use RefreshDatabase;

    public function test_legacy_execute_returns_true_after_database_records_cleanup(): void
    {
        $subjectUser = User::factory()->create();
        $secondUser = User::factory()->create();
        $subjectFolder = Folder::create([
            'name' => 'account-delete-database-legacy-subject-folder',
            'parent_id' => null,
            'user_id' => $subjectUser->id,
        ]);
        $subjectFile = File::create([
            'user_id' => $subjectUser->id,
            'folder_id' => null,
            'original_name' => 'account-delete-database-legacy-subject.bin',
            'stored_name' => 'account-delete-database-legacy-subject.bin',
            'path' => 'nimbusdrive/account-delete-database-legacy-subject.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 10,
        ]);
        $secondFolder = Folder::create([
            'name' => 'account-delete-database-legacy-second-folder',
            'parent_id' => null,
            'user_id' => $secondUser->id,
        ]);
        $secondFile = File::create([
            'user_id' => $secondUser->id,
            'folder_id' => null,
            'original_name' => 'account-delete-database-legacy-second.bin',
            'stored_name' => 'account-delete-database-legacy-second.bin',
            'path' => 'nimbusdrive/account-delete-database-legacy-second.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 11,
        ]);

        $manifestService = app(AccountDeleteCleanupManifestService::class);
        $manifest = $manifestService->createForUser($subjectUser);
        $this->assertTrue($manifestService->beginAttempt($manifest));
        $inProgressManifest = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($inProgressManifest);
        $this->assertTrue($manifestService->markCategoryCompleted($inProgressManifest, 'share_links'));
        $eligibleManifest = $inProgressManifest->fresh();
        $this->assertNotNull($eligibleManifest);

        $result = app(AccountDeleteDatabaseRecordsCleanupOrchestrator::class)
            ->execute($eligibleManifest);

        $this->assertTrue($result);
        $this->assertNull(File::withTrashed()->find($subjectFile->id));
        $this->assertNull(Folder::withTrashed()->find($subjectFolder->id));
        $this->assertNotNull(File::withTrashed()->find($secondFile->id));
        $this->assertNotNull(Folder::withTrashed()->find($secondFolder->id));
        $this->assertNotNull(User::query()->find($subjectUser->id));
        $this->assertNotNull(User::query()->find($secondUser->id));
        $this->assertSame(
            'completed',
            $eligibleManifest->fresh()->category_states['database_records'],
        );
    }
}

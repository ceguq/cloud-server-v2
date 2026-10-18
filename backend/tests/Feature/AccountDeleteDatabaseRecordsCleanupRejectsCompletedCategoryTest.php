<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\AccountDeleteCleanupManifest;
use App\Models\File;
use App\Models\Folder;
use App\Models\User;
use App\Services\AccountDeleteCleanupManifestService;
use App\Services\AccountDeleteDatabaseRecordsCleanupResult;
use App\Services\AccountDeleteDatabaseRecordsCleanupService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class AccountDeleteDatabaseRecordsCleanupRejectsCompletedCategoryTest extends TestCase
{
    use RefreshDatabase;

    public function test_database_records_cleanup_is_rejected_when_database_records_category_is_already_completed(): void
    {
        $subjectUser = User::factory()->create([
            'email' => 'account-delete-database-completed-subject@example.com',
            'password' => null,
        ]);
        $secondUser = User::factory()->create([
            'email' => 'account-delete-database-completed-second@example.com',
            'password' => null,
        ]);

        $subjectFolder = Folder::create([
            'name' => 'account-delete-database-completed-subject-folder',
            'parent_id' => null,
            'user_id' => $subjectUser->id,
        ]);
        $subjectFile = File::create([
            'user_id' => $subjectUser->id,
            'folder_id' => null,
            'original_name' => 'account-delete-database-completed-subject.bin',
            'stored_name' => 'account-delete-database-completed-subject.bin',
            'path' => 'nimbusdrive/account-delete-database-completed-subject.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 10,
        ]);
        $secondFolder = Folder::create([
            'name' => 'account-delete-database-completed-second-folder',
            'parent_id' => null,
            'user_id' => $secondUser->id,
        ]);
        $secondFile = File::create([
            'user_id' => $secondUser->id,
            'folder_id' => null,
            'original_name' => 'account-delete-database-completed-second.bin',
            'stored_name' => 'account-delete-database-completed-second.bin',
            'path' => 'nimbusdrive/account-delete-database-completed-second.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 11,
        ]);

        $subjectToken = $subjectUser->createToken('account-delete-database-completed-subject');
        $subjectTokenId = (int) $subjectToken->accessToken->getKey();
        $secondUserToken = $secondUser->createToken('account-delete-database-completed-second');
        $secondUserTokenId = (int) $secondUserToken->accessToken->getKey();

        $manifestService = app(AccountDeleteCleanupManifestService::class);
        $manifest = $manifestService->createForUser($subjectUser);
        $this->assertTrue($manifestService->beginAttempt($manifest));

        $inProgressManifest = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($inProgressManifest);
        $this->assertTrue($manifestService->markCategoryCompleted($inProgressManifest, 'share_links'));

        $shareLinksCompletedManifest = $inProgressManifest->fresh();
        $this->assertNotNull($shareLinksCompletedManifest);
        $this->assertTrue($manifestService->markCategoryCompleted($shareLinksCompletedManifest, 'database_records'));

        $completedCategoryManifest = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($completedCategoryManifest);
        $this->assertSame('in_progress', $completedCategoryManifest->status);
        $this->assertSame('completed', $completedCategoryManifest->category_states['share_links']);
        $this->assertSame('completed', $completedCategoryManifest->category_states['database_records']);
        $this->assertNull($completedCategoryManifest->completed_at);
        $this->assertNull($completedCategoryManifest->failure_category);

        $subjectFileId = $subjectFile->id;
        $subjectFolderId = $subjectFolder->id;
        $secondFileId = $secondFile->id;
        $secondFolderId = $secondFolder->id;

        $service = app(AccountDeleteDatabaseRecordsCleanupService::class);
        $result = $service->cleanupWithResult($completedCategoryManifest);

        $this->assertInstanceOf(AccountDeleteDatabaseRecordsCleanupResult::class, $result);
        $this->assertFalse($result->executed);
        $this->assertSame(0, $result->deletedCount);

        $this->assertNotNull(File::query()->find($subjectFileId));
        $this->assertNotNull(Folder::query()->find($subjectFolderId));
        $this->assertNotNull(User::query()->find($subjectUser->id));
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $subjectTokenId]);
        $this->assertNotNull(File::query()->find($secondFileId));
        $this->assertNotNull(Folder::query()->find($secondFolderId));
        $this->assertNotNull(User::query()->find($secondUser->id));
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $secondUserTokenId]);

        $manifestAfterCleanup = $completedCategoryManifest->fresh();
        $this->assertNotNull($manifestAfterCleanup);
        $this->assertSame('in_progress', $manifestAfterCleanup->status);
        $this->assertSame('completed', $manifestAfterCleanup->category_states['share_links']);
        $this->assertSame('completed', $manifestAfterCleanup->category_states['database_records']);
        $this->assertNull($manifestAfterCleanup->completed_at);
        $this->assertNull($manifestAfterCleanup->failure_category);
    }
}

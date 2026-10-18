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

final class AccountDeleteDatabaseRecordsCleanupRequiresInProgressManifestTest extends TestCase
{
    use RefreshDatabase;

    public function test_database_records_cleanup_is_rejected_when_manifest_is_not_in_progress(): void
    {
        $subjectUser = User::factory()->create([
            'email' => 'account-delete-database-not-in-progress-subject@example.com',
            'password' => null,
        ]);
        $secondUser = User::factory()->create([
            'email' => 'account-delete-database-not-in-progress-second@example.com',
            'password' => null,
        ]);

        $subjectFolder = Folder::create([
            'name' => 'account-delete-database-not-in-progress-subject-folder',
            'parent_id' => null,
            'user_id' => $subjectUser->id,
        ]);
        $subjectFile = File::create([
            'user_id' => $subjectUser->id,
            'folder_id' => null,
            'original_name' => 'account-delete-database-not-in-progress-subject.bin',
            'stored_name' => 'account-delete-database-not-in-progress-subject.bin',
            'path' => 'nimbusdrive/account-delete-database-not-in-progress-subject.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 10,
        ]);
        $secondFolder = Folder::create([
            'name' => 'account-delete-database-not-in-progress-second-folder',
            'parent_id' => null,
            'user_id' => $secondUser->id,
        ]);
        $secondFile = File::create([
            'user_id' => $secondUser->id,
            'folder_id' => null,
            'original_name' => 'account-delete-database-not-in-progress-second.bin',
            'stored_name' => 'account-delete-database-not-in-progress-second.bin',
            'path' => 'nimbusdrive/account-delete-database-not-in-progress-second.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 11,
        ]);

        $subjectToken = $subjectUser->createToken('account-delete-database-not-in-progress-subject');
        $subjectTokenId = (int) $subjectToken->accessToken->getKey();
        $secondUserToken = $secondUser->createToken('account-delete-database-not-in-progress-second');
        $secondUserTokenId = (int) $secondUserToken->accessToken->getKey();

        $manifestService = app(AccountDeleteCleanupManifestService::class);
        $manifest = $manifestService->createForUser($subjectUser);
        $this->assertTrue($manifestService->beginAttempt($manifest));

        $inProgressManifest = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($inProgressManifest);
        $this->assertTrue($manifestService->markCategoryCompleted($inProgressManifest, 'share_links'));

        $eligibleManifest = $inProgressManifest->fresh();
        $this->assertNotNull($eligibleManifest);
        $this->assertSame('completed', $eligibleManifest->category_states['share_links']);
        $this->assertSame('pending', $eligibleManifest->category_states['database_records']);

        // Restore the supported initial pending lifecycle state while preserving category setup.
        $eligibleManifest->forceFill([
            'status' => 'pending',
            'attempt_count' => 0,
            'last_attempt_at' => null,
        ])->save();
        $manifest = $eligibleManifest->fresh();
        $this->assertNotNull($manifest);

        $subjectFileId = $subjectFile->id;
        $subjectFolderId = $subjectFolder->id;
        $secondFileId = $secondFile->id;
        $secondFolderId = $secondFolder->id;
        $expectedStatus = $manifest->status;
        $expectedCategoryStates = $manifest->category_states;

        $this->assertNotSame('in_progress', $manifest->status);
        $this->assertSame('pending', $manifest->status);
        $this->assertSame('completed', $manifest->category_states['share_links']);
        $this->assertSame('pending', $manifest->category_states['database_records']);

        $service = app(AccountDeleteDatabaseRecordsCleanupService::class);
        $result = $service->cleanupWithResult($manifest);

        $this->assertInstanceOf(AccountDeleteDatabaseRecordsCleanupResult::class, $result);
        $this->assertFalse($result->executed);
        $this->assertSame(0, $result->deletedCount);

        $this->assertNotNull(File::query()->find($subjectFileId));
        $this->assertNotNull(Folder::query()->find($subjectFolderId));
        $this->assertNotNull(File::query()->find($secondFileId));
        $this->assertNotNull(Folder::query()->find($secondFolderId));
        $this->assertDatabaseHas('users', ['id' => $subjectUser->id]);
        $this->assertDatabaseHas('users', ['id' => $secondUser->id]);
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $subjectTokenId]);
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $secondUserTokenId]);

        $manifestAfterCleanup = $manifest->fresh();
        $this->assertNotNull($manifestAfterCleanup);
        $this->assertSame($expectedStatus, $manifestAfterCleanup->status);
        $this->assertSame($expectedCategoryStates, $manifestAfterCleanup->category_states);
        $this->assertSame('completed', $manifestAfterCleanup->category_states['share_links']);
        $this->assertSame('pending', $manifestAfterCleanup->category_states['database_records']);
    }
}

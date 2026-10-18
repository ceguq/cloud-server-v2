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

final class AccountDeleteDatabaseRecordsCleanupRejectsFailedManifestTest extends TestCase
{
    use RefreshDatabase;

    public function test_database_records_cleanup_is_rejected_when_manifest_has_failure_category(): void
    {
        $subjectUser = User::factory()->create();
        $secondUser = User::factory()->create();

        $subjectFolder = Folder::create([
            'name' => 'account-delete-failed-subject-folder',
            'parent_id' => null,
            'user_id' => $subjectUser->id,
        ]);
        $subjectFile = File::create([
            'user_id' => $subjectUser->id,
            'folder_id' => null,
            'original_name' => 'account-delete-failed-subject.bin',
            'stored_name' => 'account-delete-failed-subject.bin',
            'path' => 'nimbusdrive/account-delete-failed-subject.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 10,
        ]);
        $secondFolder = Folder::create([
            'name' => 'account-delete-failed-second-folder',
            'parent_id' => null,
            'user_id' => $secondUser->id,
        ]);
        $secondFile = File::create([
            'user_id' => $secondUser->id,
            'folder_id' => null,
            'original_name' => 'account-delete-failed-second.bin',
            'stored_name' => 'account-delete-failed-second.bin',
            'path' => 'nimbusdrive/account-delete-failed-second.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 11,
        ]);

        $subjectToken = $subjectUser->createToken('account-delete-failed-subject');
        $subjectTokenId = (int) $subjectToken->accessToken->getKey();
        $secondUserToken = $secondUser->createToken('account-delete-failed-second');
        $secondUserTokenId = (int) $secondUserToken->accessToken->getKey();

        $manifestService = app(AccountDeleteCleanupManifestService::class);
        $manifest = $manifestService->createForUser($subjectUser);
        $this->assertTrue($manifestService->beginAttempt($manifest));

        $inProgressManifest = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($inProgressManifest);
        $this->assertTrue($manifestService->markCategoryCompleted($inProgressManifest, 'share_links'));

        $eligibleManifest = $inProgressManifest->fresh();
        $this->assertNotNull($eligibleManifest);
        $eligibleManifest->forceFill(['failure_category' => 'oauth_identities'])->save();

        $failedManifest = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($failedManifest);
        $this->assertSame('in_progress', $failedManifest->status);
        $this->assertSame('oauth_identities', $failedManifest->failure_category);
        $this->assertSame('completed', $failedManifest->category_states['share_links']);
        $this->assertSame('pending', $failedManifest->category_states['database_records']);
        $this->assertNull($failedManifest->completed_at);

        $subjectFileId = $subjectFile->id;
        $subjectFolderId = $subjectFolder->id;
        $secondFileId = $secondFile->id;
        $secondFolderId = $secondFolder->id;
        $manifestStatus = $failedManifest->status;
        $failureCategory = $failedManifest->failure_category;
        $completedAt = $failedManifest->completed_at;

        $service = app(AccountDeleteDatabaseRecordsCleanupService::class);
        $result = $service->cleanupWithResult($failedManifest);

        $this->assertInstanceOf(AccountDeleteDatabaseRecordsCleanupResult::class, $result);
        $this->assertFalse($result->executed);
        $this->assertSame(0, $result->deletedCount);

        $this->assertNotNull(File::withTrashed()->find($subjectFileId));
        $this->assertNotNull(Folder::withTrashed()->find($subjectFolderId));
        $this->assertNotNull(User::query()->find($subjectUser->id));
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $subjectTokenId]);
        $this->assertNotNull(File::withTrashed()->find($secondFileId));
        $this->assertNotNull(Folder::withTrashed()->find($secondFolderId));
        $this->assertNotNull(User::query()->find($secondUser->id));
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $secondUserTokenId]);

        $manifestAfterCleanup = $failedManifest->fresh();
        $this->assertNotNull($manifestAfterCleanup);
        $this->assertSame($manifestStatus, $manifestAfterCleanup->status);
        $this->assertSame($failureCategory, $manifestAfterCleanup->failure_category);
        $this->assertSame('completed', $manifestAfterCleanup->category_states['share_links']);
        $this->assertSame('pending', $manifestAfterCleanup->category_states['database_records']);
        $this->assertEquals($completedAt, $manifestAfterCleanup->completed_at);
    }
}

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

final class AccountDeleteDatabaseRecordsCleanupRejectsCompletedAtManifestTest extends TestCase
{
    use RefreshDatabase;

    public function test_database_records_cleanup_is_rejected_when_manifest_has_completed_at(): void
    {
        $subjectUser = User::factory()->create();
        $secondUser = User::factory()->create();

        $subjectFolder = Folder::create([
            'name' => 'account-delete-completed-at-subject-folder',
            'parent_id' => null,
            'user_id' => $subjectUser->id,
        ]);
        $subjectFile = File::create([
            'user_id' => $subjectUser->id,
            'folder_id' => null,
            'original_name' => 'account-delete-completed-at-subject.bin',
            'stored_name' => 'account-delete-completed-at-subject.bin',
            'path' => 'nimbusdrive/account-delete-completed-at-subject.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 10,
        ]);
        $secondFolder = Folder::create([
            'name' => 'account-delete-completed-at-second-folder',
            'parent_id' => null,
            'user_id' => $secondUser->id,
        ]);
        $secondFile = File::create([
            'user_id' => $secondUser->id,
            'folder_id' => null,
            'original_name' => 'account-delete-completed-at-second.bin',
            'stored_name' => 'account-delete-completed-at-second.bin',
            'path' => 'nimbusdrive/account-delete-completed-at-second.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 11,
        ]);
        $subjectToken = $subjectUser->createToken('account-delete-completed-at-subject');
        $secondUserToken = $secondUser->createToken('account-delete-completed-at-second');

        $manifestService = app(AccountDeleteCleanupManifestService::class);
        $manifest = $manifestService->createForUser($subjectUser);
        $this->assertTrue($manifestService->beginAttempt($manifest));

        $inProgressManifest = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($inProgressManifest);
        $this->assertTrue($manifestService->markCategoryCompleted($inProgressManifest, 'share_links'));

        $eligibleManifest = $inProgressManifest->fresh();
        $this->assertNotNull($eligibleManifest);
        $completedAt = now('UTC')->startOfSecond();
        $eligibleManifest->forceFill(['completed_at' => $completedAt])->save();

        $manifestWithCompletedAt = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($manifestWithCompletedAt);
        $this->assertSame('in_progress', $manifestWithCompletedAt->status);
        $this->assertSame('completed', $manifestWithCompletedAt->category_states['share_links']);
        $this->assertSame('pending', $manifestWithCompletedAt->category_states['database_records']);
        $this->assertNull($manifestWithCompletedAt->failure_category);
        $this->assertEquals($completedAt, $manifestWithCompletedAt->completed_at);

        $result = app(AccountDeleteDatabaseRecordsCleanupService::class)
            ->cleanupWithResult($manifestWithCompletedAt);

        $this->assertInstanceOf(AccountDeleteDatabaseRecordsCleanupResult::class, $result);
        $this->assertFalse($result->executed);
        $this->assertSame(0, $result->deletedCount);
        $this->assertNotNull(File::withTrashed()->find($subjectFile->id));
        $this->assertNotNull(Folder::withTrashed()->find($subjectFolder->id));
        $this->assertNotNull(User::query()->find($subjectUser->id));
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $subjectToken->accessToken->getKey()]);
        $this->assertNotNull(File::withTrashed()->find($secondFile->id));
        $this->assertNotNull(Folder::withTrashed()->find($secondFolder->id));
        $this->assertNotNull(User::query()->find($secondUser->id));
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $secondUserToken->accessToken->getKey()]);

        $manifestAfterCleanup = $manifestWithCompletedAt->fresh();
        $this->assertNotNull($manifestAfterCleanup);
        $this->assertSame('in_progress', $manifestAfterCleanup->status);
        $this->assertSame('completed', $manifestAfterCleanup->category_states['share_links']);
        $this->assertSame('pending', $manifestAfterCleanup->category_states['database_records']);
        $this->assertEquals($completedAt, $manifestAfterCleanup->completed_at);
        $this->assertNull($manifestAfterCleanup->failure_category);
    }
}

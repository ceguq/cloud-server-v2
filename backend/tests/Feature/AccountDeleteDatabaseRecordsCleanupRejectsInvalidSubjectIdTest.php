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

final class AccountDeleteDatabaseRecordsCleanupRejectsInvalidSubjectIdTest extends TestCase
{
    use RefreshDatabase;

    public function test_database_records_cleanup_is_rejected_when_manifest_subject_user_id_is_invalid(): void
    {
        $subjectUser = User::factory()->create();
        $secondUser = User::factory()->create();

        $subjectFolder = Folder::create([
            'name' => 'account-delete-invalid-subject-id-subject-folder',
            'parent_id' => null,
            'user_id' => $subjectUser->id,
        ]);
        $subjectFile = File::create([
            'user_id' => $subjectUser->id,
            'folder_id' => null,
            'original_name' => 'account-delete-invalid-subject-id-subject.bin',
            'stored_name' => 'account-delete-invalid-subject-id-subject.bin',
            'path' => 'nimbusdrive/account-delete-invalid-subject-id-subject.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 10,
        ]);
        $secondFolder = Folder::create([
            'name' => 'account-delete-invalid-subject-id-second-folder',
            'parent_id' => null,
            'user_id' => $secondUser->id,
        ]);
        $secondFile = File::create([
            'user_id' => $secondUser->id,
            'folder_id' => null,
            'original_name' => 'account-delete-invalid-subject-id-second.bin',
            'stored_name' => 'account-delete-invalid-subject-id-second.bin',
            'path' => 'nimbusdrive/account-delete-invalid-subject-id-second.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 11,
        ]);
        $subjectToken = $subjectUser->createToken('account-delete-invalid-subject-id-subject');
        $secondUserToken = $secondUser->createToken('account-delete-invalid-subject-id-second');

        $manifestService = app(AccountDeleteCleanupManifestService::class);
        $manifest = $manifestService->createForUser($subjectUser);
        $this->assertTrue($manifestService->beginAttempt($manifest));

        $inProgressManifest = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($inProgressManifest);
        $this->assertTrue($manifestService->markCategoryCompleted($inProgressManifest, 'share_links'));

        $eligibleManifest = $inProgressManifest->fresh();
        $this->assertNotNull($eligibleManifest);
        $eligibleManifest->forceFill(['subject_user_id' => 0])->save();

        $invalidSubjectManifest = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($invalidSubjectManifest);
        $this->assertSame(0, $invalidSubjectManifest->subject_user_id);
        $this->assertSame('in_progress', $invalidSubjectManifest->status);
        $this->assertSame('completed', $invalidSubjectManifest->category_states['share_links']);
        $this->assertSame('pending', $invalidSubjectManifest->category_states['database_records']);
        $this->assertNull($invalidSubjectManifest->completed_at);
        $this->assertNull($invalidSubjectManifest->failure_category);

        $result = app(AccountDeleteDatabaseRecordsCleanupService::class)
            ->cleanupWithResult($invalidSubjectManifest);

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

        $manifestAfterCleanup = $invalidSubjectManifest->fresh();
        $this->assertNotNull($manifestAfterCleanup);
        $this->assertSame(0, $manifestAfterCleanup->subject_user_id);
        $this->assertSame('in_progress', $manifestAfterCleanup->status);
        $this->assertSame('completed', $manifestAfterCleanup->category_states['share_links']);
        $this->assertSame('pending', $manifestAfterCleanup->category_states['database_records']);
        $this->assertNull($manifestAfterCleanup->completed_at);
        $this->assertNull($manifestAfterCleanup->failure_category);
    }
}

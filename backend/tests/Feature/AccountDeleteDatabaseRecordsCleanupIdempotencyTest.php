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

final class AccountDeleteDatabaseRecordsCleanupIdempotencyTest extends TestCase
{
    use RefreshDatabase;

    public function test_database_records_cleanup_is_idempotent_when_repeated_on_the_same_eligible_manifest(): void
    {
        $subjectUser = User::factory()->create([
            'email' => 'account-delete-database-idempotent-subject@example.com',
            'password' => null,
        ]);
        $secondUser = User::factory()->create([
            'email' => 'account-delete-database-idempotent-second@example.com',
            'password' => null,
        ]);

        $subjectActiveFolder = Folder::create([
            'name' => 'account-delete-database-idempotent-subject-active-folder',
            'parent_id' => null,
            'user_id' => $subjectUser->id,
        ]);
        $subjectSoftDeletedFolder = Folder::create([
            'name' => 'account-delete-database-idempotent-subject-soft-deleted-folder',
            'parent_id' => null,
            'user_id' => $subjectUser->id,
        ]);
        $subjectSoftDeletedFolder->delete();

        $subjectActiveFile = File::create([
            'user_id' => $subjectUser->id,
            'folder_id' => null,
            'original_name' => 'account-delete-database-idempotent-subject-active.bin',
            'stored_name' => 'account-delete-database-idempotent-subject-active.bin',
            'path' => 'nimbusdrive/account-delete-database-idempotent-subject-active.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 10,
        ]);
        $subjectSoftDeletedFile = File::create([
            'user_id' => $subjectUser->id,
            'folder_id' => null,
            'original_name' => 'account-delete-database-idempotent-subject-soft-deleted.bin',
            'stored_name' => 'account-delete-database-idempotent-subject-soft-deleted.bin',
            'path' => 'nimbusdrive/account-delete-database-idempotent-subject-soft-deleted.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 11,
        ]);
        $subjectSoftDeletedFile->delete();

        $secondFolder = Folder::create([
            'name' => 'account-delete-database-idempotent-second-folder',
            'parent_id' => null,
            'user_id' => $secondUser->id,
        ]);
        $secondFile = File::create([
            'user_id' => $secondUser->id,
            'folder_id' => null,
            'original_name' => 'account-delete-database-idempotent-second.bin',
            'stored_name' => 'account-delete-database-idempotent-second.bin',
            'path' => 'nimbusdrive/account-delete-database-idempotent-second.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 12,
        ]);

        $subjectToken = $subjectUser->createToken('account-delete-database-idempotent-subject-token');
        $subjectTokenId = (int) $subjectToken->accessToken->getKey();
        $secondUserToken = $secondUser->createToken('account-delete-database-idempotent-second-token');
        $secondUserTokenId = (int) $secondUserToken->accessToken->getKey();

        $manifestService = app(AccountDeleteCleanupManifestService::class);
        $manifest = $manifestService->createForUser($subjectUser);
        $this->assertTrue($manifestService->beginAttempt($manifest));
        $this->assertTrue($manifestService->markCategoryCompleted($manifest, 'share_links'));

        $eligibleManifest = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($eligibleManifest);
        $this->assertSame('in_progress', $eligibleManifest->status);
        $this->assertSame('completed', $eligibleManifest->category_states['share_links']);
        $this->assertSame('pending', $eligibleManifest->category_states['database_records']);
        $this->assertNull($eligibleManifest->completed_at);
        $this->assertNull($eligibleManifest->failure_category);

        $service = app(AccountDeleteDatabaseRecordsCleanupService::class);
        $firstResult = $service->cleanupWithResult($eligibleManifest);
        $secondResult = $service->cleanupWithResult($eligibleManifest);

        $this->assertInstanceOf(AccountDeleteDatabaseRecordsCleanupResult::class, $firstResult);
        $this->assertTrue($firstResult->executed);
        $this->assertSame(4, $firstResult->deletedCount);
        $this->assertInstanceOf(AccountDeleteDatabaseRecordsCleanupResult::class, $secondResult);
        $this->assertTrue($secondResult->executed);
        $this->assertSame(0, $secondResult->deletedCount);

        foreach ([$subjectActiveFolder, $subjectSoftDeletedFolder] as $folder) {
            $this->assertNull(Folder::query()->withTrashed()->find($folder->id));
        }
        foreach ([$subjectActiveFile, $subjectSoftDeletedFile] as $file) {
            $this->assertNull(File::query()->withTrashed()->find($file->id));
        }
        $this->assertSame(0, Folder::query()->withTrashed()->where('user_id', $subjectUser->id)->count());
        $this->assertSame(0, File::query()->withTrashed()->where('user_id', $subjectUser->id)->count());
        $this->assertDatabaseHas('users', ['id' => $subjectUser->id]);
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $subjectTokenId]);
        $this->assertDatabaseHas('users', ['id' => $secondUser->id]);
        $this->assertNotNull(Folder::query()->find($secondFolder->id));
        $this->assertNotNull(File::query()->find($secondFile->id));
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $secondUserTokenId]);

        $manifestAfterCleanup = $eligibleManifest->fresh();
        $this->assertNotNull($manifestAfterCleanup);
        $this->assertSame('in_progress', $manifestAfterCleanup->status);
        $this->assertSame('completed', $manifestAfterCleanup->category_states['share_links']);
        $this->assertSame('pending', $manifestAfterCleanup->category_states['database_records']);
        $this->assertNull($manifestAfterCleanup->completed_at);
        $this->assertNull($manifestAfterCleanup->failure_category);
    }
}

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

final class AccountDeleteDatabaseRecordsCleanupZeroRecordTest extends TestCase
{
    use RefreshDatabase;

    public function test_database_records_cleanup_completes_with_zero_deleted_count_when_subject_has_no_file_or_folder_metadata(): void
    {
        // ── Fixtures ─────────────────────────────────────────────────────────

        $subjectUser = User::factory()->create([
            'email' => 'account-delete-database-zero-subject@example.com',
            'password' => null,
        ]);

        $secondUser = User::factory()->create([
            'email' => 'account-delete-database-zero-second@example.com',
            'password' => null,
        ]);

        $this->assertDatabaseHas('users', ['id' => $subjectUser->id]);
        $this->assertDatabaseHas('users', ['id' => $secondUser->id]);

        // ── Subject User has zero Files and zero Folders ─────────────────────

        $this->assertSame(0, File::query()->withTrashed()->where('user_id', $subjectUser->id)->count());
        $this->assertSame(0, Folder::query()->withTrashed()->where('user_id', $subjectUser->id)->count());

        // ── Second User fixtures: 1 active Folder, 1 soft-deleted Folder, 1 active File, 1 soft-deleted File ──

        $secondActiveFolder = Folder::create([
            'name' => 'account-delete-database-zero-second-active-folder',
            'parent_id' => null,
            'user_id' => $secondUser->id,
        ]);

        $secondSoftDeletedFolder = Folder::create([
            'name' => 'account-delete-database-zero-second-soft-deleted-folder',
            'parent_id' => null,
            'user_id' => $secondUser->id,
        ]);
        $secondSoftDeletedFolder->delete();
        $this->assertNotNull($secondSoftDeletedFolder->fresh()->deleted_at);

        $secondActiveFile = File::create([
            'user_id' => $secondUser->id,
            'folder_id' => null,
            'original_name' => 'account-delete-database-zero-second-active.bin',
            'stored_name' => 'account-delete-database-zero-second-active.bin',
            'path' => 'nimbusdrive/account-delete-database-zero-second-active.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 10,
        ]);

        $secondSoftDeletedFile = File::create([
            'user_id' => $secondUser->id,
            'folder_id' => null,
            'original_name' => 'account-delete-database-zero-second-soft-deleted.bin',
            'stored_name' => 'account-delete-database-zero-second-soft-deleted.bin',
            'path' => 'nimbusdrive/account-delete-database-zero-second-soft-deleted.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 11,
        ]);
        $secondSoftDeletedFile->delete();
        $this->assertNotNull($secondSoftDeletedFile->fresh()->deleted_at);

        // ── Sanctum tokens ───────────────────────────────────────────────────

        $subjectToken = $subjectUser->createToken('account-delete-database-zero-subject-token');
        $subjectTokenId = (int) $subjectToken->accessToken->getKey();

        $secondUserToken = $secondUser->createToken('account-delete-database-zero-second-token');
        $secondUserTokenId = (int) $secondUserToken->accessToken->getKey();

        $this->assertDatabaseHas('personal_access_tokens', [
            'id' => $subjectTokenId,
            'tokenable_type' => $subjectUser->getMorphClass(),
            'tokenable_id' => $subjectUser->id,
        ]);

        $this->assertDatabaseHas('personal_access_tokens', [
            'id' => $secondUserTokenId,
            'tokenable_type' => $secondUser->getMorphClass(),
            'tokenable_id' => $secondUser->id,
        ]);

        // ── Manifest setup ───────────────────────────────────────────────────

        $manifestService = app(AccountDeleteCleanupManifestService::class);
        $manifest = $manifestService->createForUser($subjectUser);

        $started = $manifestService->beginAttempt($manifest);
        $this->assertTrue($started);

        $inProgressManifest = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($inProgressManifest);

        $this->assertSame('in_progress', $inProgressManifest->status);
        $this->assertSame(1, (int) $inProgressManifest->attempt_count);
        $this->assertNull($inProgressManifest->completed_at);
        $this->assertNull($inProgressManifest->failure_category);
        $this->assertSame('pending', $inProgressManifest->category_states['database_records']);

        $expectedCategories = [
            'database_records',
            'physical_local_files',
            'share_links',
            'devices',
            'oauth_identities',
            'sanctum_tokens',
            'google_drive_credentials',
            'activity_logs',
            'user_record',
            'other_user_owned_resources',
        ];

        foreach ($expectedCategories as $category) {
            $this->assertSame('pending', $inProgressManifest->category_states[$category]);
        }

        // Mark share_links as completed so database_records is eligible.
        $completed = $manifestService->markCategoryCompleted(
            $inProgressManifest,
            'share_links',
        );
        $this->assertTrue($completed);

        // Refresh manifest to obtain authoritative post-bookkeeping state.
        $eligibleManifest = AccountDeleteCleanupManifest::query()->find($inProgressManifest->getKey());
        $this->assertNotNull($eligibleManifest);

        $this->assertSame('in_progress', $eligibleManifest->status);
        $this->assertSame(1, (int) $eligibleManifest->attempt_count);
        $this->assertNull($eligibleManifest->completed_at);
        $this->assertNull($eligibleManifest->failure_category);
        $this->assertSame('pending', $eligibleManifest->category_states['database_records']);
        $this->assertSame('completed', $eligibleManifest->category_states['share_links']);

        // Capture manifest baseline after share_links completed.
        $baseline = [
            'operation_id' => $eligibleManifest->operation_id,
            'subject_user_id' => $eligibleManifest->subject_user_id,
            'ownership_snapshot' => $eligibleManifest->ownership_snapshot,
            'category_states' => $eligibleManifest->category_states,
            'status' => $eligibleManifest->status,
            'attempt_count' => (int) $eligibleManifest->attempt_count,
            'last_attempt_at' => $eligibleManifest->last_attempt_at,
            'completed_at' => $eligibleManifest->completed_at,
            'failure_category' => $eligibleManifest->failure_category,
            'created_at' => $eligibleManifest->created_at,
            'updated_at' => $eligibleManifest->updated_at,
        ];

        // Assert zero subject records before execution.
        $this->assertSame(
            0,
            File::query()->withTrashed()->where('user_id', $subjectUser->id)->count(),
        );
        $this->assertSame(
            0,
            Folder::query()->withTrashed()->where('user_id', $subjectUser->id)->count(),
        );

        // Capture second-User IDs for post-execution assertions.
        $secondActiveFolderId = $secondActiveFolder->id;
        $secondSoftDeletedFolderId = $secondSoftDeletedFolder->id;
        $secondActiveFileId = $secondActiveFile->id;
        $secondSoftDeletedFileId = $secondSoftDeletedFile->id;

        // ── Act ──────────────────────────────────────────────────────────────

        $service = app(AccountDeleteDatabaseRecordsCleanupService::class);

        $result = $service->cleanupWithResult($eligibleManifest);

        // ── Result assertions ────────────────────────────────────────────────

        $this->assertInstanceOf(AccountDeleteDatabaseRecordsCleanupResult::class, $result);
        $this->assertTrue($result->executed);
        $this->assertSame(0, $result->deletedCount);

        // ── Subject preservation ─────────────────────────────────────────────

        $this->assertNotNull(User::query()->find($subjectUser->id));

        $this->assertDatabaseHas('personal_access_tokens', ['id' => $subjectTokenId]);

        $this->assertSame(
            0,
            File::query()->withTrashed()->where('user_id', $subjectUser->id)->count(),
        );
        $this->assertSame(
            0,
            Folder::query()->withTrashed()->where('user_id', $subjectUser->id)->count(),
        );

        // ── Unrelated User preservation ──────────────────────────────────────

        $this->assertNotNull(Folder::query()->find($secondActiveFolderId));
        $this->assertNotNull(Folder::query()->withTrashed()->find($secondSoftDeletedFolderId));
        $this->assertNotNull($secondSoftDeletedFolder->fresh()->deleted_at);

        $this->assertNotNull(File::query()->find($secondActiveFileId));
        $this->assertNotNull(File::query()->withTrashed()->find($secondSoftDeletedFileId));
        $this->assertNotNull($secondSoftDeletedFile->fresh()->deleted_at);

        $this->assertNotNull(User::query()->find($secondUser->id));

        $this->assertDatabaseHas('personal_access_tokens', ['id' => $secondUserTokenId]);

        // ── Manifest preservation ────────────────────────────────────────────

        $afterManifest = AccountDeleteCleanupManifest::query()->find($inProgressManifest->getKey());
        $this->assertNotNull($afterManifest);

        $this->assertSame($baseline['status'], $afterManifest->status);
        $this->assertSame($baseline['attempt_count'], (int) $afterManifest->attempt_count);
        $this->assertNull($afterManifest->completed_at);
        $this->assertNull($afterManifest->failure_category);
        $this->assertSame($baseline['category_states'], $afterManifest->category_states);
        $this->assertSame('pending', $afterManifest->category_states['database_records']);
        $this->assertSame('completed', $afterManifest->category_states['share_links']);

        $this->assertEquals($baseline['created_at'], $afterManifest->created_at);
        $this->assertEquals($baseline['updated_at'], $afterManifest->updated_at);
    }
}

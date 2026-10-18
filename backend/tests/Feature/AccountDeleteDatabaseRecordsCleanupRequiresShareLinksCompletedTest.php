<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\AccountDeleteCleanupManifest;
use App\Models\File;
use App\Models\Folder;
use App\Models\ShareLink;
use App\Models\User;
use App\Services\AccountDeleteCleanupManifestService;
use App\Services\AccountDeleteDatabaseRecordsCleanupResult;
use App\Services\AccountDeleteDatabaseRecordsCleanupService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class AccountDeleteDatabaseRecordsCleanupRequiresShareLinksCompletedTest extends TestCase
{
    use RefreshDatabase;

    public function test_database_records_cleanup_is_rejected_until_share_links_category_is_completed(): void
    {
        // ── Fixtures ─────────────────────────────────────────────────────────

        $subjectUser = User::factory()->create([
            'email' => 'account-delete-db-req-sharelinks-subject@example.com',
            'password' => null,
        ]);

        $secondUser = User::factory()->create([
            'email' => 'account-delete-db-req-sharelinks-second@example.com',
            'password' => null,
        ]);

        $this->assertDatabaseHas('users', ['id' => $subjectUser->id]);
        $this->assertDatabaseHas('users', ['id' => $secondUser->id]);

        // ── Subject User fixtures ────────────────────────────────────────────

        $subjectFolder = Folder::create([
            'name' => 'account-delete-db-req-sharelinks-subject-folder',
            'parent_id' => null,
            'user_id' => $subjectUser->id,
        ]);

        $subjectFile = File::create([
            'user_id' => $subjectUser->id,
            'folder_id' => $subjectFolder->id,
            'original_name' => 'account-delete-db-req-sharelinks-subject-file.bin',
            'stored_name' => 'account-delete-db-req-sharelinks-subject-file.bin',
            'path' => 'nimbusdrive/account-delete-db-req-sharelinks-subject-file.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 10,
        ]);

        $subjectShareLink = ShareLink::create([
            'file_id' => $subjectFile->id,
            'token' => 'account-delete-db-req-sharelinks-subject-token-'.bin2hex(random_bytes(8)),
        ]);

        // ── Second User fixtures ─────────────────────────────────────────────

        $secondFolder = Folder::create([
            'name' => 'account-delete-db-req-sharelinks-second-folder',
            'parent_id' => null,
            'user_id' => $secondUser->id,
        ]);

        $secondFile = File::create([
            'user_id' => $secondUser->id,
            'folder_id' => $secondFolder->id,
            'original_name' => 'account-delete-db-req-sharelinks-second-file.bin',
            'stored_name' => 'account-delete-db-req-sharelinks-second-file.bin',
            'path' => 'nimbusdrive/account-delete-db-req-sharelinks-second-file.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 11,
        ]);

        $secondShareLink = ShareLink::create([
            'file_id' => $secondFile->id,
            'token' => 'account-delete-db-req-sharelinks-second-token-'.bin2hex(random_bytes(8)),
        ]);

        // ── Manifest setup ───────────────────────────────────────────────────

        $manifestService = app(AccountDeleteCleanupManifestService::class);
        $manifest = $manifestService->createForUser($subjectUser);

        $started = $manifestService->beginAttempt($manifest);
        $this->assertTrue($started);

        $inProgressManifest = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($inProgressManifest);

        // Required manifest preconditions.
        $this->assertSame('in_progress', $inProgressManifest->status);
        $this->assertSame(1, (int) $inProgressManifest->attempt_count);
        $this->assertNull($inProgressManifest->completed_at);
        $this->assertNull($inProgressManifest->failure_category);
        $this->assertSame('pending', $inProgressManifest->category_states['database_records']);
        $this->assertSame('pending', $inProgressManifest->category_states['share_links']);

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

        // Capture IDs.
        $subjectFolderId = $subjectFolder->id;
        $subjectFileId = $subjectFile->id;
        $subjectShareLinkId = $subjectShareLink->id;
        $secondFolderId = $secondFolder->id;
        $secondFileId = $secondFile->id;
        $secondShareLinkId = $secondShareLink->id;

        // Capture manifest baseline.
        $baseline = [
            'operation_id' => $inProgressManifest->operation_id,
            'subject_user_id' => $inProgressManifest->subject_user_id,
            'ownership_snapshot' => $inProgressManifest->ownership_snapshot,
            'category_states' => $inProgressManifest->category_states,
            'status' => $inProgressManifest->status,
            'attempt_count' => (int) $inProgressManifest->attempt_count,
            'last_attempt_at' => $inProgressManifest->last_attempt_at,
            'completed_at' => $inProgressManifest->completed_at,
            'failure_category' => $inProgressManifest->failure_category,
            'created_at' => $inProgressManifest->created_at,
            'updated_at' => $inProgressManifest->updated_at,
        ];

        // ── Act ──────────────────────────────────────────────────────────────

        $service = app(AccountDeleteDatabaseRecordsCleanupService::class);

        $result = $service->cleanupWithResult($inProgressManifest);

        // ── Result assertions ────────────────────────────────────────────────

        $this->assertInstanceOf(AccountDeleteDatabaseRecordsCleanupResult::class, $result);
        $this->assertFalse($result->executed, 'Database-records cleanup must be rejected when share_links is still pending.');
        $this->assertSame(0, $result->deletedCount);

        // ── Subject-data preservation ────────────────────────────────────────

        $this->assertNotNull(Folder::query()->find($subjectFolderId), 'Subject folder must not be deleted.');
        $this->assertNotNull(File::query()->find($subjectFileId), 'Subject file must not be deleted.');
        $this->assertNotNull(ShareLink::query()->find($subjectShareLinkId), 'Subject share link must not be deleted.');

        // File remains assigned to the same Folder.
        $reloadedSubjectFile = File::query()->find($subjectFileId);
        $this->assertNotNull($reloadedSubjectFile);
        $this->assertEquals($subjectFolderId, $reloadedSubjectFile->folder_id);

        // ShareLink remains assigned to the same File.
        $reloadedSubjectShareLink = ShareLink::query()->find($subjectShareLinkId);
        $this->assertNotNull($reloadedSubjectShareLink);
        $this->assertEquals($subjectFileId, $reloadedSubjectShareLink->file_id);

        // ── Other-User preservation ──────────────────────────────────────────

        $this->assertNotNull(Folder::query()->find($secondFolderId), 'Second-user folder must not be deleted.');
        $this->assertNotNull(File::query()->find($secondFileId), 'Second-user file must not be deleted.');
        $this->assertNotNull(ShareLink::query()->find($secondShareLinkId), 'Second-user share link must not be deleted.');

        // Relationships unchanged.
        $reloadedSecondFile = File::query()->find($secondFileId);
        $this->assertEquals($secondFolderId, $reloadedSecondFile->folder_id);
        $reloadedSecondShareLink = ShareLink::query()->find($secondShareLinkId);
        $this->assertEquals($secondFileId, $reloadedSecondShareLink->file_id);

        // ── User preservation ────────────────────────────────────────────────

        $this->assertNotNull(User::query()->find($subjectUser->id));
        $this->assertNotNull(User::query()->find($secondUser->id));

        // ── Manifest preservation ────────────────────────────────────────────

        $afterManifest = AccountDeleteCleanupManifest::query()->find($inProgressManifest->getKey());
        $this->assertNotNull($afterManifest);

        $this->assertSame($baseline['operation_id'], $afterManifest->operation_id);
        $this->assertSame($baseline['subject_user_id'], $afterManifest->subject_user_id);
        $this->assertSame($baseline['ownership_snapshot'], $afterManifest->ownership_snapshot);
        $this->assertSame($baseline['category_states'], $afterManifest->category_states);
        $this->assertSame($baseline['status'], $afterManifest->status);
        $this->assertSame($baseline['attempt_count'], (int) $afterManifest->attempt_count);
        $this->assertEquals($baseline['last_attempt_at'], $afterManifest->last_attempt_at);
        $this->assertNull($afterManifest->completed_at);
        $this->assertNull($afterManifest->failure_category);
        $this->assertEquals($baseline['created_at'], $afterManifest->created_at);
        $this->assertEquals($baseline['updated_at'], $afterManifest->updated_at);

        // Specific category state assertions.
        $this->assertSame('pending', $afterManifest->category_states['database_records']);
        $this->assertSame('pending', $afterManifest->category_states['share_links']);
    }
}

<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\AccountDeleteCleanupManifest;
use App\Models\File;
use App\Models\Folder;
use App\Models\User;
use App\Services\AccountDeleteCleanupManifestService;
use App\Services\AccountDeletePhysicalLocalFilesCleanupResult;
use App\Services\AccountDeletePhysicalLocalFilesCleanupService;
use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

final class AccountDeletePhysicalLocalFilesCleanupServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_cleanup_deletes_snapshot_files_idempotently_and_preserves_database_records(): void
    {
        Storage::fake('local');

        $subjectUser = User::factory()->create();
        $otherUser = User::factory()->create();
        $subjectActiveFile = $this->createFile($subjectUser, 'subject-active.bin');
        $subjectTrashedFile = $this->createFile($subjectUser, 'subject-trashed.bin');
        $subjectTrashedFile->delete();
        $subjectFolder = Folder::create([
            'name' => 'subject-folder',
            'parent_id' => null,
            'user_id' => $subjectUser->id,
        ]);
        $otherFile = $this->createFile($otherUser, 'other-active.bin');
        $otherFolder = Folder::create([
            'name' => 'other-folder',
            'parent_id' => null,
            'user_id' => $otherUser->id,
        ]);

        Storage::disk('local')->put($subjectActiveFile->path, 'subject active');
        Storage::disk('local')->put($subjectTrashedFile->path, 'subject trashed');
        Storage::disk('local')->put($otherFile->path, 'other file');

        $manifest = $this->eligibleManifest($subjectUser);
        $this->assertSame([
            $subjectActiveFile->path,
            $subjectTrashedFile->path,
        ], $manifest->ownership_snapshot['physical_paths']);

        $service = app(AccountDeletePhysicalLocalFilesCleanupService::class);
        $firstResult = $service->cleanupWithResult($manifest);
        $secondResult = $service->cleanupWithResult($manifest);

        $this->assertInstanceOf(AccountDeletePhysicalLocalFilesCleanupResult::class, $firstResult);
        $this->assertTrue($firstResult->executed);
        $this->assertSame(2, $firstResult->deletedCount);
        $this->assertInstanceOf(AccountDeletePhysicalLocalFilesCleanupResult::class, $secondResult);
        $this->assertTrue($secondResult->executed);
        $this->assertSame(0, $secondResult->deletedCount);

        Storage::disk('local')->assertMissing($subjectActiveFile->path);
        Storage::disk('local')->assertMissing($subjectTrashedFile->path);
        Storage::disk('local')->assertExists($otherFile->path);
        $this->assertNotNull(File::withTrashed()->find($subjectActiveFile->id));
        $this->assertNotNull(File::withTrashed()->find($subjectTrashedFile->id));
        $this->assertNotNull(Folder::withTrashed()->find($subjectFolder->id));
        $this->assertNotNull(User::query()->find($subjectUser->id));
        $this->assertNotNull(File::query()->find($otherFile->id));
        $this->assertNotNull(Folder::query()->find($otherFolder->id));
        $this->assertNotNull(User::query()->find($otherUser->id));
    }

    public function test_cleanup_uses_snapshot_after_subject_file_metadata_is_removed(): void
    {
        Storage::fake('local');

        $subjectUser = User::factory()->create();
        $file = $this->createFile($subjectUser, 'snapshot-only.bin');
        Storage::disk('local')->put($file->path, 'snapshot data');
        $manifest = $this->eligibleManifest($subjectUser);

        $file->forceDelete();
        $this->assertNull(File::withTrashed()->find($file->id));

        $result = app(AccountDeletePhysicalLocalFilesCleanupService::class)
            ->cleanupWithResult($manifest);

        $this->assertTrue($result->executed);
        $this->assertSame(1, $result->deletedCount);
        Storage::disk('local')->assertMissing('nimbusdrive/snapshot-only.bin');
        $this->assertNotNull(User::query()->find($subjectUser->id));
    }

    public function test_cleanup_succeeds_when_snapshot_contains_no_physical_paths(): void
    {
        Storage::fake('local');

        $subjectUser = User::factory()->create();
        $manifest = $this->eligibleManifest($subjectUser);

        $result = app(AccountDeletePhysicalLocalFilesCleanupService::class)
            ->cleanupWithResult($manifest);

        $this->assertTrue($result->executed);
        $this->assertSame(0, $result->deletedCount);
    }

    public function test_cleanup_rejects_ineligible_manifest_without_deleting_files(): void
    {
        Storage::fake('local');

        $subjectUser = User::factory()->create();
        $file = $this->createFile($subjectUser, 'guarded.bin');
        Storage::disk('local')->put($file->path, 'must remain');
        $manifestService = app(AccountDeleteCleanupManifestService::class);

        $notStarted = $manifestService->createForUser($subjectUser);
        $manifests = [$notStarted];

        $sharePending = $this->beginManifest($subjectUser);
        $manifests[] = $sharePending;

        $failed = $this->eligibleManifest($subjectUser);
        $failed->failure_category = 'physical_local_files';
        $failed->save();
        $manifests[] = $failed;

        $completedCategory = $this->eligibleManifest($subjectUser);
        $this->assertTrue($manifestService->markCategoryCompleted($completedCategory, 'physical_local_files'));
        $manifests[] = $completedCategory;

        $service = app(AccountDeletePhysicalLocalFilesCleanupService::class);

        foreach ($manifests as $manifest) {
            $result = $service->cleanupWithResult($manifest);

            $this->assertInstanceOf(AccountDeletePhysicalLocalFilesCleanupResult::class, $result);
            $this->assertFalse($result->executed);
            $this->assertSame(0, $result->deletedCount);
        }

        Storage::disk('local')->assertExists($file->path);
        $this->assertNotNull(File::query()->find($file->id));
        $this->assertNotNull(User::query()->find($subjectUser->id));
    }

    public function test_cleanup_rejects_invalid_snapshot_before_deleting_any_file(): void
    {
        Storage::fake('local');

        $subjectUser = User::factory()->create();
        $file = $this->createFile($subjectUser, 'invalid-snapshot.bin');
        Storage::disk('local')->put($file->path, 'must remain');
        $manifest = $this->eligibleManifest($subjectUser);
        $snapshot = $manifest->ownership_snapshot;
        $snapshot['physical_paths'][] = 'nimbusdrive/../outside.bin';
        $snapshot['physical_paths'][] = 123;
        $manifest->ownership_snapshot = $snapshot;
        $manifest->save();

        $result = app(AccountDeletePhysicalLocalFilesCleanupService::class)
            ->cleanupWithResult($manifest);

        $this->assertFalse($result->executed);
        $this->assertSame(0, $result->deletedCount);
        Storage::disk('local')->assertExists($file->path);
    }

    public function test_cleanup_reports_partial_deletion_when_storage_rejects_a_delete(): void
    {
        $subjectUser = User::factory()->create();
        $manifest = $this->eligibleManifest($subjectUser);
        $snapshot = $manifest->ownership_snapshot;
        $snapshot['physical_paths'] = [
            'nimbusdrive/first.bin',
            'nimbusdrive/second.bin',
        ];
        $manifest->ownership_snapshot = $snapshot;
        $manifest->save();

        $disk = \Mockery::mock(Filesystem::class);
        $disk->shouldReceive('exists')->once()->with('nimbusdrive/first.bin')->andReturn(true);
        $disk->shouldReceive('delete')->once()->with('nimbusdrive/first.bin')->andReturn(true);
        $disk->shouldReceive('exists')->once()->with('nimbusdrive/second.bin')->andReturn(true);
        $disk->shouldReceive('delete')->once()->with('nimbusdrive/second.bin')->andReturn(false);
        Storage::set('local', $disk);

        $result = app(AccountDeletePhysicalLocalFilesCleanupService::class)
            ->cleanupWithResult($manifest);

        $this->assertFalse($result->executed);
        $this->assertSame(1, $result->deletedCount);
    }

    private function eligibleManifest(User $user): AccountDeleteCleanupManifest
    {
        $manifest = $this->beginManifest($user);
        $manifestService = app(AccountDeleteCleanupManifestService::class);
        $this->assertTrue($manifestService->markCategoryCompleted($manifest, 'share_links'));

        return AccountDeleteCleanupManifest::query()->findOrFail($manifest->getKey());
    }

    private function beginManifest(User $user): AccountDeleteCleanupManifest
    {
        $manifestService = app(AccountDeleteCleanupManifestService::class);
        $manifest = $manifestService->createForUser($user);
        $this->assertTrue($manifestService->beginAttempt($manifest));

        return AccountDeleteCleanupManifest::query()->findOrFail($manifest->getKey());
    }

    private function createFile(User $user, string $name): File
    {
        return File::create([
            'user_id' => $user->id,
            'folder_id' => null,
            'original_name' => $name,
            'stored_name' => $name,
            'path' => 'nimbusdrive/'.$name,
            'mime_type' => 'application/octet-stream',
            'size' => 1,
        ]);
    }
}

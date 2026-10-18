<?php

namespace Tests\Feature;

use App\Models\File;
use App\Models\User;
use App\Services\AccountDeleteCleanupManifestService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AccountDeleteCleanupManifestServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_account_delete_cleanup_manifest_collects_active_and_soft_deleted_file_paths(): void
    {
        $user = User::factory()->create();

        $activeFile = File::create([
            'user_id' => $user->id,
            'folder_id' => null,
            'original_name' => 'active.bin',
            'stored_name' => 'active.bin',
            'path' => 'nimbusdrive/active-owned-file.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 123,
        ]);

        $trashedFile = File::create([
            'user_id' => $user->id,
            'folder_id' => null,
            'original_name' => 'trashed.bin',
            'stored_name' => 'trashed.bin',
            'path' => 'nimbusdrive/trashed-owned-file.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 456,
        ]);

        $trashedFile->delete();

        /** @var class-string $serviceClass */
        $serviceClass = AccountDeleteCleanupManifestService::class;

        $service = app($serviceClass);

        $paths = $service->collectPhysicalPaths($user);

        $this->assertCount(2, $paths);
        $this->assertContains('nimbusdrive/active-owned-file.bin', $paths);
        $this->assertContains('nimbusdrive/trashed-owned-file.bin', $paths);

        // Collection must be read-only: ensure both rows still exist with expected soft-delete state.
        $activeRow = File::query()->where('id', $activeFile->id)->first();
        $trashedRow = File::query()->withTrashed()->where('id', $trashedFile->id)->first();

        $this->assertNotNull($activeRow);
        $this->assertNull($activeRow->deleted_at);

        $this->assertNotNull($trashedRow);
        $this->assertNotNull($trashedRow->deleted_at);
    }

    public function test_account_delete_cleanup_manifest_excludes_another_users_physical_path(): void
    {
        $targetUser = User::factory()->create();
        $anotherUser = User::factory()->create();

        File::create([
            'user_id' => $targetUser->id,
            'folder_id' => null,
            'original_name' => 'target.bin',
            'stored_name' => 'target.bin',
            'path' => 'nimbusdrive/target-user-file.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 100,
        ]);

        File::create([
            'user_id' => $anotherUser->id,
            'folder_id' => null,
            'original_name' => 'another.bin',
            'stored_name' => 'another.bin',
            'path' => 'nimbusdrive/another-user-file.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 200,
        ]);

        $service = app(AccountDeleteCleanupManifestService::class);

        $paths = $service->collectPhysicalPaths($targetUser);

        $this->assertCount(1, $paths);
        $this->assertContains('nimbusdrive/target-user-file.bin', $paths);
        $this->assertNotContains('nimbusdrive/another-user-file.bin', $paths);

        $this->assertSame(1, File::query()->where('user_id', $targetUser->getKey())->count());
        $this->assertSame(1, File::query()->where('user_id', $anotherUser->getKey())->count());
    }

    public function test_account_delete_cleanup_manifest_deduplicates_identical_physical_paths(): void
    {
        $user = User::factory()->create();

        $firstFile = File::create([
            'user_id' => $user->id,
            'folder_id' => null,
            'original_name' => 'first.bin',
            'stored_name' => 'first.bin',
            'path' => 'nimbusdrive/shared-physical-path.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 111,
        ]);

        $secondFile = File::create([
            'user_id' => $user->id,
            'folder_id' => null,
            'original_name' => 'second.bin',
            'stored_name' => 'second.bin',
            'path' => 'nimbusdrive/shared-physical-path.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 222,
        ]);

        $secondFile->delete();

        $service = app(AccountDeleteCleanupManifestService::class);

        $paths = $service->collectPhysicalPaths($user);

        $this->assertCount(1, $paths);

        $sharedPathCount = count(array_filter(
            $paths,
            static fn (string $path): bool => $path === 'nimbusdrive/shared-physical-path.bin',
        ));

        $this->assertSame(1, $sharedPathCount);

        $this->assertNotNull(File::query()->where('id', $firstFile->id)->first());
        $this->assertNull(File::query()->where('id', $firstFile->id)->first()->deleted_at);

        $softDeletedRow = File::query()->withTrashed()->where('id', $secondFile->id)->first();
        $this->assertNotNull($softDeletedRow);
        $this->assertNotNull($softDeletedRow->deleted_at);
    }
}

<?php

namespace Tests\Feature;

use App\Models\File;
use App\Models\Folder;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class RecursiveFolderOwnershipTest extends TestCase
{
    use RefreshDatabase;

    public function test_same_user_recursive_soft_delete_succeeds(): void
    {
        $user = User::factory()->create();
        $root = Folder::create([
            'name' => 'Root',
            'parent_id' => null,
            'user_id' => $user->id,
        ]);
        $child = Folder::create([
            'name' => 'Child',
            'parent_id' => $root->id,
            'user_id' => $user->id,
        ]);
        $file = File::create([
            'user_id' => $user->id,
            'folder_id' => $child->id,
            'original_name' => 'nested.txt',
            'stored_name' => 'nested.txt',
            'path' => 'nimbusdrive/nested.txt',
            'mime_type' => 'text/plain',
            'size' => 10,
        ]);

        $response = $this->actingAs($user, 'sanctum')->deleteJson('/api/folders/' . $root->id);

        $response->assertStatus(200)
            ->assertJsonPath('message', 'Folder dipindahkan ke Trash');

        $this->assertTrue(Folder::withTrashed()->find($root->id)->trashed());
        $this->assertTrue(Folder::withTrashed()->find($child->id)->trashed());
        $this->assertTrue(File::withTrashed()->find($file->id)->trashed());
    }

    public function test_mixed_owner_recursive_soft_delete_is_rejected_before_mutation(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();

        $root = Folder::create([
            'name' => 'Root',
            'parent_id' => null,
            'user_id' => $user->id,
        ]);
        $ownedChild = Folder::create([
            'name' => 'Owned Child',
            'parent_id' => $root->id,
            'user_id' => $user->id,
        ]);
        $conflictingChild = Folder::create([
            'name' => 'Conflicting Child',
            'parent_id' => $root->id,
            'user_id' => $otherUser->id,
        ]);
        $ownedFile = File::create([
            'user_id' => $user->id,
            'folder_id' => $ownedChild->id,
            'original_name' => 'owned.txt',
            'stored_name' => 'owned.txt',
            'path' => 'nimbusdrive/owned.txt',
            'mime_type' => 'text/plain',
            'size' => 10,
        ]);

        $response = $this->actingAs($user, 'sanctum')->deleteJson('/api/folders/' . $root->id);

        $response->assertStatus(422)
            ->assertJsonPath('message', 'Subtree ini mengandung folder atau file yang bukan milik Anda');

        $this->assertFalse(Folder::withTrashed()->find($root->id)->trashed());
        $this->assertFalse(Folder::withTrashed()->find($ownedChild->id)->trashed());
        $this->assertFalse(File::withTrashed()->find($ownedFile->id)->trashed());
        $this->assertDatabaseCount('folders', 3);
        $this->assertDatabaseCount('files', 1);
    }

    public function test_mixed_owner_recursive_restore_is_rejected_before_mutation(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();

        $root = Folder::create([
            'name' => 'Root',
            'parent_id' => null,
            'user_id' => $user->id,
        ]);
        $ownedChild = Folder::create([
            'name' => 'Owned Child',
            'parent_id' => $root->id,
            'user_id' => $user->id,
        ]);
        $conflictingChild = Folder::create([
            'name' => 'Conflicting Child',
            'parent_id' => $root->id,
            'user_id' => $otherUser->id,
        ]);
        $ownedFile = File::create([
            'user_id' => $user->id,
            'folder_id' => $ownedChild->id,
            'original_name' => 'owned.txt',
            'stored_name' => 'owned.txt',
            'path' => 'nimbusdrive/owned.txt',
            'mime_type' => 'text/plain',
            'size' => 10,
        ]);

        $root->delete();
        $ownedChild->delete();
        $ownedFile->delete();
        $conflictingChild->delete();

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/trash/folders/' . $root->id . '/restore');

        $response->assertStatus(422)
            ->assertJsonPath('message', 'Subtree ini mengandung folder atau file yang bukan milik Anda');

        $this->assertTrue(Folder::withTrashed()->find($root->id)->trashed());
        $this->assertTrue(Folder::withTrashed()->find($ownedChild->id)->trashed());
        $this->assertTrue(File::withTrashed()->find($ownedFile->id)->trashed());
        $this->assertTrue(Folder::withTrashed()->find($conflictingChild->id)->trashed());
    }

    public function test_same_user_recursive_restore_succeeds(): void
    {
        $user = User::factory()->create();
        $root = Folder::create([
            'name' => 'Root',
            'parent_id' => null,
            'user_id' => $user->id,
        ]);
        $child = Folder::create([
            'name' => 'Child',
            'parent_id' => $root->id,
            'user_id' => $user->id,
        ]);
        $file = File::create([
            'user_id' => $user->id,
            'folder_id' => $child->id,
            'original_name' => 'nested.txt',
            'stored_name' => 'nested.txt',
            'path' => 'nimbusdrive/nested.txt',
            'mime_type' => 'text/plain',
            'size' => 10,
        ]);

        $root->delete();
        $child->delete();
        $file->delete();

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/trash/folders/' . $root->id . '/restore');

        $response->assertStatus(200)
            ->assertJsonPath('message', 'Folder berhasil direstore');

        $this->assertFalse(Folder::withTrashed()->find($root->id)->trashed());
        $this->assertFalse(Folder::withTrashed()->find($child->id)->trashed());
        $this->assertFalse(File::withTrashed()->find($file->id)->trashed());
    }

    public function test_mixed_owner_recursive_force_delete_is_rejected_before_mutation(): void
    {
        Storage::fake('local');

        $user = User::factory()->create();
        $otherUser = User::factory()->create();

        $root = Folder::create([
            'name' => 'Root',
            'parent_id' => null,
            'user_id' => $user->id,
        ]);
        $ownedChild = Folder::create([
            'name' => 'Owned Child',
            'parent_id' => $root->id,
            'user_id' => $user->id,
        ]);
        $conflictingChild = Folder::create([
            'name' => 'Conflicting Child',
            'parent_id' => $root->id,
            'user_id' => $otherUser->id,
        ]);
        $ownedFile = File::create([
            'user_id' => $user->id,
            'folder_id' => $ownedChild->id,
            'original_name' => 'owned.txt',
            'stored_name' => 'owned.txt',
            'path' => 'nimbusdrive/owned.txt',
            'mime_type' => 'text/plain',
            'size' => 10,
        ]);

        $root->delete();
        $ownedChild->delete();
        $ownedFile->delete();
        $conflictingChild->delete();
        Storage::disk('local')->put($ownedFile->path, 'content');

        $response = $this->actingAs($user, 'sanctum')->deleteJson('/api/trash/folders/' . $root->id . '/force');

        $response->assertStatus(422)
            ->assertJsonPath('message', 'Subtree ini mengandung folder atau file yang bukan milik Anda');

        $this->assertTrue(Folder::withTrashed()->find($root->id)->trashed());
        $this->assertTrue(Folder::withTrashed()->find($ownedChild->id)->trashed());
        $this->assertTrue(File::withTrashed()->find($ownedFile->id)->trashed());
        $this->assertTrue(Folder::withTrashed()->find($conflictingChild->id)->trashed());
        $this->assertTrue(Storage::disk('local')->exists($ownedFile->path));
    }

    public function test_same_user_recursive_force_delete_succeeds(): void
    {
        Storage::fake('local');

        $user = User::factory()->create();
        $root = Folder::create([
            'name' => 'Root',
            'parent_id' => null,
            'user_id' => $user->id,
        ]);
        $child = Folder::create([
            'name' => 'Child',
            'parent_id' => $root->id,
            'user_id' => $user->id,
        ]);
        $file = File::create([
            'user_id' => $user->id,
            'folder_id' => $child->id,
            'original_name' => 'nested.txt',
            'stored_name' => 'nested.txt',
            'path' => 'nimbusdrive/nested.txt',
            'mime_type' => 'text/plain',
            'size' => 10,
        ]);

        $root->delete();
        $child->delete();
        $file->delete();
        Storage::disk('local')->put($file->path, 'content');

        $response = $this->actingAs($user, 'sanctum')->deleteJson('/api/trash/folders/' . $root->id . '/force');

        $response->assertStatus(200)
            ->assertJsonPath('message', 'Folder berhasil dihapus permanen');

        $this->assertDatabaseMissing('folders', ['id' => $root->id]);
        $this->assertDatabaseMissing('folders', ['id' => $child->id]);
        $this->assertDatabaseMissing('files', ['id' => $file->id]);
        $this->assertFalse(Storage::disk('local')->exists($file->path));
    }

    public function test_null_owned_descendant_is_rejected(): void
    {
        $user = User::factory()->create();
        $root = Folder::create([
            'name' => 'Root',
            'parent_id' => null,
            'user_id' => $user->id,
        ]);
        $nullChild = Folder::create([
            'name' => 'Null Child',
            'parent_id' => $root->id,
            'user_id' => null,
        ]);

        $response = $this->actingAs($user, 'sanctum')->deleteJson('/api/folders/' . $root->id);

        $response->assertStatus(422)
            ->assertJsonPath('message', 'Subtree ini mengandung folder atau file yang bukan milik Anda');

        $this->assertFalse(Folder::withTrashed()->find($root->id)->trashed());
        $this->assertFalse(Folder::withTrashed()->find($nullChild->id)->trashed());
    }

    public function test_create_folder_under_another_users_parent_is_rejected(): void
    {
        $owner = User::factory()->create();
        $otherUser = User::factory()->create();
        $parentFolder = Folder::create([
            'name' => 'Owner parent',
            'parent_id' => null,
            'user_id' => $owner->id,
        ]);

        $response = $this->actingAs($otherUser, 'sanctum')->postJson('/api/folders', [
            'name' => 'Sneaky child',
            'parent_id' => $parentFolder->id,
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('message', 'Folder tujuan tidak ditemukan atau bukan milik Anda');

        $this->assertDatabaseMissing('folders', ['name' => 'Sneaky child']);
    }

    public function test_move_folder_into_another_users_parent_is_rejected(): void
    {
        $owner = User::factory()->create();
        $otherUser = User::factory()->create();
        $ownFolder = Folder::create([
            'name' => 'Own folder',
            'parent_id' => null,
            'user_id' => $otherUser->id,
        ]);
        $otherParent = Folder::create([
            'name' => 'Other parent',
            'parent_id' => null,
            'user_id' => $owner->id,
        ]);

        $response = $this->actingAs($otherUser, 'sanctum')->patchJson('/api/folders/' . $ownFolder->id . '/move', [
            'parent_id' => $otherParent->id,
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('message', 'Folder tujuan tidak ditemukan atau bukan milik Anda');

        $this->assertSame(null, $ownFolder->fresh()->parent_id);
    }

    public function test_upload_file_into_another_users_folder_is_rejected(): void
    {
        $owner = User::factory()->create();
        $otherUser = User::factory()->create();
        $folder = Folder::create([
            'name' => 'Owner folder',
            'parent_id' => null,
            'user_id' => $owner->id,
        ]);

        $response = $this->actingAs($otherUser, 'sanctum')->postJson('/api/files/upload', [
            'file' => UploadedFile::fake()->create('sneaky.txt', 1, 'text/plain'),
            'folder_id' => $folder->id,
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('message', 'Folder tujuan tidak ditemukan atau bukan milik Anda');

        $this->assertDatabaseCount('files', 0);
    }

    public function test_move_file_into_another_users_folder_is_rejected(): void
    {
        $owner = User::factory()->create();
        $otherUser = User::factory()->create();
        $folder = Folder::create([
            'name' => 'Owner folder',
            'parent_id' => null,
            'user_id' => $owner->id,
        ]);
        $file = File::create([
            'user_id' => $otherUser->id,
            'folder_id' => null,
            'original_name' => 'owned.txt',
            'stored_name' => 'owned.txt',
            'path' => 'nimbusdrive/owned.txt',
            'mime_type' => 'text/plain',
            'size' => 10,
        ]);

        $response = $this->actingAs($otherUser, 'sanctum')->patchJson('/api/files/' . $file->id . '/move', [
            'folder_id' => $folder->id,
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('message', 'Folder tujuan tidak ditemukan atau bukan milik Anda');

        $this->assertSame(null, $file->fresh()->folder_id);
    }
}

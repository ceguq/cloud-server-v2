<?php

namespace Tests\Feature;

use App\Models\File;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class FileUploadQuotaTest extends TestCase
{
    use RefreshDatabase;

    private const QUOTA_LIMIT_BYTES = 100 * 1024 * 1024 * 1024;

    public function test_upload_succeeds_when_user_is_under_quota(): void
    {
        Storage::fake('local');
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/files/upload', [
            'file' => UploadedFile::fake()->create('small.txt', 100, 'text/plain'),
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('message', 'File berhasil diupload');

        $this->assertDatabaseHas('files', [
            'user_id' => $user->id,
            'original_name' => 'small.txt',
        ]);
    }

    public function test_upload_succeeds_when_user_reaches_the_exact_quota_limit(): void
    {
        Storage::fake('local');
        $user = User::factory()->create();

        File::create([
            'user_id' => $user->id,
            'folder_id' => null,
            'original_name' => 'existing.txt',
            'stored_name' => 'existing.txt',
            'path' => 'nimbusdrive/existing.txt',
            'mime_type' => 'text/plain',
            'size' => self::QUOTA_LIMIT_BYTES - 1024,
        ]);

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/files/upload', [
            'file' => UploadedFile::fake()->create('new.txt', 1, 'text/plain'),
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseCount('files', 2);
    }

    public function test_upload_is_rejected_when_user_would_exceed_quota(): void
    {
        Storage::fake('local');
        $user = User::factory()->create();

        File::create([
            'user_id' => $user->id,
            'folder_id' => null,
            'original_name' => 'existing.txt',
            'stored_name' => 'existing.txt',
            'path' => 'nimbusdrive/existing.txt',
            'mime_type' => 'text/plain',
            'size' => self::QUOTA_LIMIT_BYTES - 1,
        ]);

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/files/upload', [
            'file' => UploadedFile::fake()->create('too-large.txt', 2, 'text/plain'),
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('errors.file.0', 'Storage quota exceeded.');

        $this->assertDatabaseCount('files', 1);
    }

    public function test_quota_is_scoped_to_the_authenticated_user(): void
    {
        Storage::fake('local');
        $owner = User::factory()->create();
        $otherUser = User::factory()->create();

        File::create([
            'user_id' => $owner->id,
            'folder_id' => null,
            'original_name' => 'owner.txt',
            'stored_name' => 'owner.txt',
            'path' => 'nimbusdrive/owner.txt',
            'mime_type' => 'text/plain',
            'size' => self::QUOTA_LIMIT_BYTES,
        ]);

        $response = $this->actingAs($otherUser, 'sanctum')->postJson('/api/files/upload', [
            'file' => UploadedFile::fake()->create('guest.txt', 1, 'text/plain'),
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('files', [
            'user_id' => $otherUser->id,
            'original_name' => 'guest.txt',
        ]);
        $this->assertDatabaseCount('files', 2);
    }
}

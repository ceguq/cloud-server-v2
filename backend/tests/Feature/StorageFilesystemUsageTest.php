<?php

namespace Tests\Feature;

use App\Models\File;
use App\Models\User;
use App\Services\FilesystemStatsProvider;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Mockery;
use Tests\TestCase;

class StorageFilesystemUsageTest extends TestCase
{
    use RefreshDatabase;

    public function test_storage_info_uses_os_filesystem_stats_for_the_configured_local_disk(): void
    {
        Storage::fake('local');
        $localRoot = Storage::disk('local')->path('');
        $user = User::factory()->create();

        File::create([
            'user_id' => $user->id,
            'folder_id' => null,
            'original_name' => 'database-record.txt',
            'stored_name' => 'database-record.txt',
            'path' => 'nimbusdrive/database-record.txt',
            'mime_type' => 'text/plain',
            'size' => 123,
        ]);

        $stats = Mockery::mock(FilesystemStatsProvider::class);
        $stats->shouldReceive('totalSpace')->once()->with($localRoot)->andReturn(10000);
        $stats->shouldReceive('freeSpace')->once()->with($localRoot)->andReturn(2500);
        $this->app->instance(FilesystemStatsProvider::class, $stats);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/storage')
            ->assertOk()
            ->assertJsonPath('data.filesystem_available', true)
            ->assertJsonPath('data.used_bytes', 123)
            ->assertJsonPath('data.limit_bytes', 10000)
            ->assertJsonPath('data.free_bytes', 2500)
            ->assertJsonPath('data.usage_percent', 1.23)
            ->assertJsonPath('data.free_percent', 25)
            ->assertJsonPath('data.file_count', 1);
    }

    public function test_storage_info_returns_unavailable_when_filesystem_stats_fail(): void
    {
        Storage::fake('local');
        $user = User::factory()->create();

        $stats = Mockery::mock(FilesystemStatsProvider::class);
        $stats->shouldReceive('totalSpace')->once()->andThrow(new \RuntimeException('stat failed'));
        $this->app->instance(FilesystemStatsProvider::class, $stats);

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/storage');

        $response->assertOk()
            ->assertJsonPath('data.filesystem_available', false)
            ->assertJsonPath('data.used_bytes', null)
            ->assertJsonPath('data.limit_bytes', null)
            ->assertJsonPath('data.free_bytes', null);

        $this->assertStringNotContainsString(storage_path(), $response->getContent());
    }

    public function test_storage_info_rejects_invalid_filesystem_statistics(): void
    {
        Storage::fake('local');
        $user = User::factory()->create();

        $stats = Mockery::mock(FilesystemStatsProvider::class);
        $stats->shouldReceive('totalSpace')->once()->andReturn(1000);
        $stats->shouldReceive('freeSpace')->once()->andReturn(1200);
        $this->app->instance(FilesystemStatsProvider::class, $stats);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/storage')
            ->assertOk()
            ->assertJsonPath('data.filesystem_available', false)
            ->assertJsonPath('data.used_bytes', null)
            ->assertJsonPath('data.usage_percent', null);
    }
}

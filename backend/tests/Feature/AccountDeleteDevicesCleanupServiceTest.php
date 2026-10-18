<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\AccountDeleteCleanupManifest;
use App\Models\Device;
use App\Models\User;
use App\Services\AccountDeleteCleanupManifestService;
use App\Services\AccountDeleteDevicesCleanupResult;
use App\Services\AccountDeleteDevicesCleanupService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class AccountDeleteDevicesCleanupServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_cleanup_deletes_only_subject_devices_idempotently_without_changing_bookkeeping(): void
    {
        $subjectUser = User::factory()->create();
        $otherUser = User::factory()->create();
        $subjectDevices = [
            $this->createDevice($subjectUser, 'subject-one'),
            $this->createDevice($subjectUser, 'subject-two'),
        ];
        $otherDevice = $this->createDevice($otherUser, 'other');
        $manifest = $this->eligibleManifest($subjectUser);

        $service = app(AccountDeleteDevicesCleanupService::class);
        $firstResult = $service->cleanupWithResult($manifest);
        $secondResult = $service->cleanupWithResult($manifest);

        $this->assertInstanceOf(AccountDeleteDevicesCleanupResult::class, $firstResult);
        $this->assertTrue($firstResult->executed);
        $this->assertSame(2, $firstResult->deletedCount);
        $this->assertInstanceOf(AccountDeleteDevicesCleanupResult::class, $secondResult);
        $this->assertTrue($secondResult->executed);
        $this->assertSame(0, $secondResult->deletedCount);

        foreach ($subjectDevices as $device) {
            $this->assertNull(Device::query()->find($device->id));
        }
        $this->assertNotNull(Device::query()->find($otherDevice->id));
        $this->assertNotNull(User::query()->find($subjectUser->id));
        $this->assertNotNull(User::query()->find($otherUser->id));

        $manifestAfter = AccountDeleteCleanupManifest::query()->findOrFail($manifest->getKey());
        $this->assertSame('in_progress', $manifestAfter->status);
        $this->assertSame('completed', $manifestAfter->category_states['database_records']);
        $this->assertSame('pending', $manifestAfter->category_states['devices']);
        $this->assertNull($manifestAfter->completed_at);
        $this->assertNull($manifestAfter->failure_category);
    }

    public function test_cleanup_rejects_manifests_without_completed_database_records_or_with_failed_state(): void
    {
        $subjectUser = User::factory()->create();
        $device = $this->createDevice($subjectUser, 'guarded');

        $databasePending = $this->begunManifest($subjectUser);

        $failed = $this->eligibleManifest($subjectUser);
        $failed->failure_category = 'devices';
        $failed->save();

        foreach ([$databasePending, $failed] as $manifest) {
            $result = app(AccountDeleteDevicesCleanupService::class)->cleanupWithResult($manifest);
            $this->assertFalse($result->executed);
            $this->assertSame(0, $result->deletedCount);
            $this->assertNotNull(Device::query()->find($device->id));
        }
    }

    private function eligibleManifest(User $user): AccountDeleteCleanupManifest
    {
        $manifestService = app(AccountDeleteCleanupManifestService::class);
        $manifest = $this->begunManifest($user);
        foreach (['share_links', 'oauth_identities', 'physical_local_files', 'database_records'] as $category) {
            $this->assertTrue($manifestService->markCategoryCompleted($manifest, $category));
        }

        return AccountDeleteCleanupManifest::query()->findOrFail($manifest->getKey());
    }

    private function begunManifest(User $user): AccountDeleteCleanupManifest
    {
        $manifestService = app(AccountDeleteCleanupManifestService::class);
        $manifest = $manifestService->createForUser($user);
        $this->assertTrue($manifestService->beginAttempt($manifest));

        return AccountDeleteCleanupManifest::query()->findOrFail($manifest->getKey());
    }

    private function createDevice(User $user, string $suffix): Device
    {
        return Device::query()->create([
            'user_id' => $user->id,
            'display_name' => "Device {$suffix}",
            'device_type' => 'desktop',
            'platform' => 'Linux',
            'browser' => 'Chrome',
            'device_hash' => hash('sha256', $suffix),
        ]);
    }
}

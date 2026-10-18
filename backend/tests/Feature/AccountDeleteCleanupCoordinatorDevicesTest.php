<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\AccountDeleteCleanupManifest;
use App\Models\Device;
use App\Models\User;
use App\Services\AccountDeleteCleanupCategoryExecutionResult;
use App\Services\AccountDeleteCleanupCoordinator;
use App\Services\AccountDeleteCleanupManifestService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class AccountDeleteCleanupCoordinatorDevicesTest extends TestCase
{
    use RefreshDatabase;

    public function test_coordinator_cleans_devices_after_database_records_and_before_sanctum_tokens(): void
    {
        $subject = User::factory()->create();
        $other = User::factory()->create();
        $subjectDevice = $this->createDevice($subject, 'subject');
        $otherDevice = $this->createDevice($other, 'other');
        $manifestService = app(AccountDeleteCleanupManifestService::class);
        $manifest = $manifestService->createForUser($subject);
        $this->assertTrue($manifestService->beginAttempt($manifest));

        $results = app(AccountDeleteCleanupCoordinator::class)->execute(
            AccountDeleteCleanupManifest::query()->findOrFail($manifest->getKey()),
        );

        $this->assertSame(
            ['share_links', 'oauth_identities', 'physical_local_files', 'database_records', 'devices', 'sanctum_tokens', 'google_drive_credentials', 'activity_logs', 'other_user_owned_resources', 'user_record'],
            array_map(
                static fn (AccountDeleteCleanupCategoryExecutionResult $result): string => $result->category,
                $results,
            ),
        );
        foreach ($results as $result) {
            $this->assertSame(AccountDeleteCleanupCategoryExecutionResult::OUTCOME_COMPLETED, $result->outcome);
        }
        $this->assertNull(Device::query()->find($subjectDevice->id));
        $this->assertNotNull(Device::query()->find($otherDevice->id));
        $this->assertNull(User::query()->find($subject->id));
        $this->assertNotNull(User::query()->find($other->id));

        $manifestAfter = AccountDeleteCleanupManifest::query()->findOrFail($manifest->getKey());
        $this->assertSame('completed', $manifestAfter->category_states['database_records']);
        $this->assertSame('completed', $manifestAfter->category_states['devices']);
        $this->assertSame('completed', $manifestAfter->category_states['sanctum_tokens']);
        $this->assertSame('completed', $manifestAfter->category_states['google_drive_credentials']);
        $this->assertSame('completed', $manifestAfter->category_states['activity_logs']);
        $this->assertSame('completed', $manifestAfter->category_states['other_user_owned_resources']);
        $this->assertSame('completed', $manifestAfter->category_states['user_record']);
        $this->assertSame('completed', $manifestAfter->status);
        $this->assertNotNull($manifestAfter->completed_at);
    }

    private function createDevice(User $user, string $key): Device
    {
        return Device::query()->create([
            'user_id' => $user->id,
            'device_hash' => hash('sha256', $key),
        ]);
    }
}

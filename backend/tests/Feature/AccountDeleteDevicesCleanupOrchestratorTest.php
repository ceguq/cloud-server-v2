<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\AccountDeleteCleanupManifest;
use App\Models\Device;
use App\Models\User;
use App\Services\AccountDeleteCleanupCategoryExecutionResult;
use App\Services\AccountDeleteCleanupManifestService;
use App\Services\AccountDeleteDevicesCleanupOrchestrator;
use App\Services\AccountDeleteDevicesCleanupService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class AccountDeleteDevicesCleanupOrchestratorTest extends TestCase
{
    use RefreshDatabase;

    public function test_orchestrator_completes_devices_after_successful_cleanup(): void
    {
        $user = User::factory()->create();
        $device = $this->createDevice($user);
        $manifest = $this->eligibleManifest($user);

        $result = app(AccountDeleteDevicesCleanupOrchestrator::class)->executeWithResult($manifest);

        $this->assertSame('devices', $result->category);
        $this->assertSame(AccountDeleteCleanupCategoryExecutionResult::OUTCOME_COMPLETED, $result->outcome);
        $this->assertTrue($result->cleanupExecuted);
        $this->assertTrue($result->categoryCompleted);
        $this->assertNull(Device::query()->find($device->id));
        $this->assertSame(
            'completed',
            AccountDeleteCleanupManifest::query()->findOrFail($manifest->getKey())->category_states['devices'],
        );
    }

    public function test_orchestrator_rejects_ineligible_manifest_without_completing_category(): void
    {
        $user = User::factory()->create();
        $device = $this->createDevice($user);
        $manifest = app(AccountDeleteCleanupManifestService::class)->createForUser($user);

        $result = app(AccountDeleteDevicesCleanupOrchestrator::class)->executeWithResult($manifest);

        $this->assertSame(AccountDeleteCleanupCategoryExecutionResult::OUTCOME_REJECTED, $result->outcome);
        $this->assertFalse($result->cleanupExecuted);
        $this->assertFalse($result->categoryCompleted);
        $this->assertNotNull(Device::query()->find($device->id));
        $this->assertSame(
            'pending',
            AccountDeleteCleanupManifest::query()->findOrFail($manifest->getKey())->category_states['devices'],
        );
    }

    public function test_orchestrator_reports_bookkeeping_failure_and_legacy_execute_returns_false(): void
    {
        $user = User::factory()->create();
        $device = $this->createDevice($user);
        $manifest = $this->eligibleManifest($user);
        $manifestService = \Mockery::mock(AccountDeleteCleanupManifestService::class);
        $manifestService->shouldReceive('markCategoryCompleted')
            ->twice()
            ->with(\Mockery::on(
                fn (AccountDeleteCleanupManifest $argument): bool => $argument->getKey() === $manifest->getKey(),
            ), 'devices')
            ->andReturn(false);
        $orchestrator = new AccountDeleteDevicesCleanupOrchestrator(
            app(AccountDeleteDevicesCleanupService::class),
            $manifestService,
        );

        $result = $orchestrator->executeWithResult($manifest);

        $this->assertSame(AccountDeleteCleanupCategoryExecutionResult::OUTCOME_BOOKKEEPING_FAILED, $result->outcome);
        $this->assertTrue($result->cleanupExecuted);
        $this->assertFalse($result->categoryCompleted);
        $this->assertFalse($orchestrator->execute($manifest));
        $this->assertNull(Device::query()->find($device->id));
    }

    public function test_orchestrator_rejects_a_stale_manifest(): void
    {
        $user = User::factory()->create();
        $manifest = app(AccountDeleteCleanupManifestService::class)->createForUser($user);
        $manifest->delete();

        $result = app(AccountDeleteDevicesCleanupOrchestrator::class)->executeWithResult($manifest);

        $this->assertSame(AccountDeleteCleanupCategoryExecutionResult::OUTCOME_REJECTED, $result->outcome);
        $this->assertFalse($result->cleanupExecuted);
        $this->assertFalse($result->categoryCompleted);
    }

    private function eligibleManifest(User $user): AccountDeleteCleanupManifest
    {
        $manifestService = app(AccountDeleteCleanupManifestService::class);
        $manifest = $manifestService->createForUser($user);
        $this->assertTrue($manifestService->beginAttempt($manifest));
        foreach (['share_links', 'oauth_identities', 'physical_local_files', 'database_records'] as $category) {
            $this->assertTrue($manifestService->markCategoryCompleted($manifest, $category));
        }

        return AccountDeleteCleanupManifest::query()->findOrFail($manifest->getKey());
    }

    private function createDevice(User $user): Device
    {
        return Device::query()->create([
            'user_id' => $user->id,
            'device_hash' => hash('sha256', (string) $user->id),
        ]);
    }
}

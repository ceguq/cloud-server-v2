<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\AccountDeleteCleanupManifest;
use App\Models\File;
use App\Models\User;
use App\Services\AccountDeleteCleanupManifestService;
use App\Services\AccountDeleteCleanupRemediationResult;
use App\Services\AccountDeleteCleanupRemediationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

final class AccountDeleteCleanupRemediationServiceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config(['cache.default' => 'array']);
        app('cache')->setDefaultDriver('array');
    }

    public function test_resuming_an_in_progress_manifest_records_a_failed_category_for_retry(): void
    {
        $user = User::factory()->create();
        $path = 'nimbusdrive/remediation-failure.bin';
        File::create([
            'user_id' => $user->getKey(),
            'folder_id' => null,
            'original_name' => 'remediation-failure.bin',
            'stored_name' => 'remediation-failure.bin',
            'path' => $path,
            'mime_type' => 'application/octet-stream',
            'size' => 10,
        ]);

        $manifestService = app(AccountDeleteCleanupManifestService::class);
        $manifest = $manifestService->resolveOrCreateForUser($user);
        $this->assertTrue($manifestService->beginAttempt($manifest));

        $disk = \Mockery::mock();
        $disk->shouldReceive('exists')->once()->with($path)->andReturn(true);
        $disk->shouldReceive('delete')->once()->with($path)->andReturn(false);
        Storage::shouldReceive('disk')->once()->with('local')->andReturn($disk);

        $result = app(AccountDeleteCleanupRemediationService::class)->resume($manifest->operation_id);
        $after = AccountDeleteCleanupManifest::query()->findOrFail($manifest->getKey());

        $this->assertSame(AccountDeleteCleanupRemediationResult::OUTCOME_CLEANUP_PENDING, $result->outcome);
        $this->assertSame('cleanup_pending', $after->status);
        $this->assertSame('physical_local_files', $after->failure_category);
        $this->assertSame('failed', $after->category_states['physical_local_files']);
        $this->assertSame(1, $after->attempt_count);
    }

    public function test_retrying_cleanup_pending_resumes_the_same_manifest_and_reports_completion(): void
    {
        $user = User::factory()->create();
        $path = 'nimbusdrive/remediation-retry.bin';
        File::create([
            'user_id' => $user->getKey(),
            'folder_id' => null,
            'original_name' => 'remediation-retry.bin',
            'stored_name' => 'remediation-retry.bin',
            'path' => $path,
            'mime_type' => 'application/octet-stream',
            'size' => 10,
        ]);

        $manifestService = app(AccountDeleteCleanupManifestService::class);
        $manifest = $manifestService->resolveOrCreateForUser($user);
        $this->assertTrue($manifestService->beginAttempt($manifest));

        $disk = \Mockery::mock();
        $disk->shouldReceive('exists')->twice()->with($path)->andReturn(true, true);
        $disk->shouldReceive('delete')->twice()->with($path)->andReturn(false, true);
        Storage::shouldReceive('disk')->twice()->with('local')->andReturn($disk);

        $service = app(AccountDeleteCleanupRemediationService::class);
        $firstResult = $service->resume($manifest->operation_id);
        $failedManifest = $manifest->fresh();
        $this->assertNotNull($failedManifest);
        $this->assertSame(AccountDeleteCleanupRemediationResult::OUTCOME_CLEANUP_PENDING, $firstResult->outcome);
        $this->assertSame('cleanup_pending', $failedManifest->status);
        $this->assertSame('physical_local_files', $failedManifest->failure_category);

        $operationId = $manifest->operation_id;
        $result = $service->resume($operationId);
        $after = AccountDeleteCleanupManifest::query()->findOrFail($manifest->getKey());

        $this->assertSame(AccountDeleteCleanupRemediationResult::OUTCOME_COMPLETED, $result->outcome);
        $this->assertSame($operationId, $after->operation_id);
        $this->assertSame('completed', $after->status);
        $this->assertSame(2, $after->attempt_count);
    }

    public function test_pending_or_unknown_manifests_are_rejected_without_running_cleanup(): void
    {
        $user = User::factory()->create();
        $manifest = app(AccountDeleteCleanupManifestService::class)->createForUser($user);

        $service = app(AccountDeleteCleanupRemediationService::class);

        $this->assertSame(
            AccountDeleteCleanupRemediationResult::OUTCOME_REJECTED,
            $service->resume($manifest->operation_id)->outcome,
        );
        $this->assertSame(
            AccountDeleteCleanupRemediationResult::OUTCOME_REJECTED,
            $service->resume('unknown-operation-id')->outcome,
        );
        $this->assertSame('pending', $manifest->fresh()->status);
    }

    public function test_remediation_rejects_a_manifest_when_another_worker_holds_its_lock(): void
    {
        $user = User::factory()->create();
        $manifest = app(AccountDeleteCleanupManifestService::class)->createForUser($user);
        $this->assertTrue(app(AccountDeleteCleanupManifestService::class)->beginAttempt($manifest));

        $lock = Cache::lock(
            'account-delete-remediation:'.hash('sha256', $manifest->operation_id),
            60,
        );
        $this->assertTrue($lock->get());

        $result = app(AccountDeleteCleanupRemediationService::class)->resume($manifest->operation_id);
        $lock->release();

        $this->assertSame(AccountDeleteCleanupRemediationResult::OUTCOME_REJECTED, $result->outcome);
        $this->assertSame('in_progress', $manifest->fresh()->status);
    }
}

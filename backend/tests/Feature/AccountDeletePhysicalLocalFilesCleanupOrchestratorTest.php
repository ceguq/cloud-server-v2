<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\AccountDeleteCleanupManifest;
use App\Models\File;
use App\Models\User;
use App\Services\AccountDeleteCleanupCategoryExecutionResult;
use App\Services\AccountDeleteCleanupManifestService;
use App\Services\AccountDeletePhysicalLocalFilesCleanupOrchestrator;
use App\Services\AccountDeletePhysicalLocalFilesCleanupService;
use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

final class AccountDeletePhysicalLocalFilesCleanupOrchestratorTest extends TestCase
{
    use RefreshDatabase;

    public function test_orchestrator_completes_category_after_successful_cleanup(): void
    {
        Storage::fake('local');
        $user = User::factory()->create();
        $file = $this->createFile($user);
        Storage::disk('local')->put($file->path, 'stored');
        $manifest = $this->eligibleManifest($user);

        $result = app(AccountDeletePhysicalLocalFilesCleanupOrchestrator::class)
            ->executeWithResult($manifest);

        $this->assertSame('physical_local_files', $result->category);
        $this->assertSame(AccountDeleteCleanupCategoryExecutionResult::OUTCOME_COMPLETED, $result->outcome);
        $this->assertTrue($result->cleanupExecuted);
        $this->assertTrue($result->categoryCompleted);
        Storage::disk('local')->assertMissing($file->path);
        $this->assertSame(
            'completed',
            AccountDeleteCleanupManifest::query()->findOrFail($manifest->getKey())->category_states['physical_local_files'],
        );
    }

    public function test_orchestrator_rejects_cleanup_without_completing_category(): void
    {
        Storage::fake('local');
        $user = User::factory()->create();
        $file = $this->createFile($user);
        Storage::disk('local')->put($file->path, 'must remain');
        $manifest = app(AccountDeleteCleanupManifestService::class)->createForUser($user);

        $result = app(AccountDeletePhysicalLocalFilesCleanupOrchestrator::class)
            ->executeWithResult($manifest);

        $this->assertSame(AccountDeleteCleanupCategoryExecutionResult::OUTCOME_REJECTED, $result->outcome);
        $this->assertFalse($result->cleanupExecuted);
        $this->assertFalse($result->categoryCompleted);
        Storage::disk('local')->assertExists($file->path);
        $this->assertSame(
            'pending',
            AccountDeleteCleanupManifest::query()->findOrFail($manifest->getKey())->category_states['physical_local_files'],
        );
    }

    public function test_orchestrator_reports_bookkeeping_failure_and_legacy_execute_returns_false(): void
    {
        Storage::fake('local');
        $user = User::factory()->create();
        $file = $this->createFile($user);
        Storage::disk('local')->put($file->path, 'stored');
        $manifest = $this->eligibleManifest($user);
        $manifestService = \Mockery::mock(AccountDeleteCleanupManifestService::class);
        $manifestService->shouldReceive('markCategoryCompleted')
            ->twice()
            ->with(\Mockery::on(
                fn (AccountDeleteCleanupManifest $argument): bool => $argument->getKey() === $manifest->getKey(),
            ), 'physical_local_files')
            ->andReturn(false);
        $orchestrator = new AccountDeletePhysicalLocalFilesCleanupOrchestrator(
            app(AccountDeletePhysicalLocalFilesCleanupService::class),
            $manifestService,
        );

        $result = $orchestrator->executeWithResult($manifest);

        $this->assertSame(AccountDeleteCleanupCategoryExecutionResult::OUTCOME_BOOKKEEPING_FAILED, $result->outcome);
        $this->assertTrue($result->cleanupExecuted);
        $this->assertFalse($result->categoryCompleted);
        $this->assertFalse($orchestrator->execute($manifest));
        Storage::disk('local')->assertMissing($file->path);
    }

    public function test_orchestrator_rejects_a_stale_manifest(): void
    {
        $user = User::factory()->create();
        $manifest = app(AccountDeleteCleanupManifestService::class)->createForUser($user);
        $manifest->delete();

        $result = app(AccountDeletePhysicalLocalFilesCleanupOrchestrator::class)
            ->executeWithResult($manifest);

        $this->assertSame(AccountDeleteCleanupCategoryExecutionResult::OUTCOME_REJECTED, $result->outcome);
        $this->assertFalse($result->cleanupExecuted);
        $this->assertFalse($result->categoryCompleted);
    }

    public function test_orchestrator_leaves_category_pending_after_partial_storage_failure(): void
    {
        $user = User::factory()->create();
        $manifest = $this->eligibleManifest($user);
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
        $manifestService = \Mockery::mock(AccountDeleteCleanupManifestService::class);
        $manifestService->shouldNotReceive('markCategoryCompleted');

        $result = (new AccountDeletePhysicalLocalFilesCleanupOrchestrator(
            app(AccountDeletePhysicalLocalFilesCleanupService::class),
            $manifestService,
        ))->executeWithResult($manifest);

        $this->assertSame(AccountDeleteCleanupCategoryExecutionResult::OUTCOME_REJECTED, $result->outcome);
        $this->assertFalse($result->cleanupExecuted);
        $this->assertFalse($result->categoryCompleted);
        $this->assertSame(
            'pending',
            AccountDeleteCleanupManifest::query()->findOrFail($manifest->getKey())->category_states['physical_local_files'],
        );
    }

    private function eligibleManifest(User $user): AccountDeleteCleanupManifest
    {
        $manifestService = app(AccountDeleteCleanupManifestService::class);
        $manifest = $manifestService->createForUser($user);
        $this->assertTrue($manifestService->beginAttempt($manifest));
        $this->assertTrue($manifestService->markCategoryCompleted($manifest, 'share_links'));

        return AccountDeleteCleanupManifest::query()->findOrFail($manifest->getKey());
    }

    private function createFile(User $user): File
    {
        return File::create([
            'user_id' => $user->id,
            'folder_id' => null,
            'original_name' => 'physical-local-file.bin',
            'stored_name' => 'physical-local-file.bin',
            'path' => 'nimbusdrive/physical-local-file.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 1,
        ]);
    }
}

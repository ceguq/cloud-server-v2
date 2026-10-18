<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\AccountDeleteCleanupManifest;
use App\Models\ActivityLog;
use App\Models\User;
use App\Services\AccountDeleteActivityLogsCleanupOrchestrator;
use App\Services\AccountDeleteActivityLogsCleanupService;
use App\Services\AccountDeleteCleanupCategoryExecutionResult;
use App\Services\AccountDeleteCleanupManifestService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\TestCase;

final class AccountDeleteActivityLogsCleanupOrchestratorTest extends TestCase
{
    use RefreshDatabase;

    public function test_orchestrator_completes_category_after_cleanup(): void
    {
        $user = User::factory()->create();
        $log = $this->createLog($user);
        $manifest = $this->inProgressManifest($user);

        $result = app(AccountDeleteActivityLogsCleanupOrchestrator::class)
            ->executeWithResult($manifest);

        $this->assertSame('activity_logs', $result->category);
        $this->assertSame(AccountDeleteCleanupCategoryExecutionResult::OUTCOME_COMPLETED, $result->outcome);
        $this->assertTrue($result->cleanupExecuted);
        $this->assertTrue($result->categoryCompleted);
        $this->assertNull(ActivityLog::query()->find($log->getKey()));
        $this->assertSame(
            'completed',
            AccountDeleteCleanupManifest::query()->findOrFail($manifest->getKey())->category_states['activity_logs'],
        );
    }

    public function test_orchestrator_rejects_a_stale_manifest(): void
    {
        $user = User::factory()->create();
        $manifest = app(AccountDeleteCleanupManifestService::class)->createForUser($user);
        $manifest->delete();

        $result = app(AccountDeleteActivityLogsCleanupOrchestrator::class)
            ->executeWithResult($manifest);

        $this->assertSame(AccountDeleteCleanupCategoryExecutionResult::OUTCOME_REJECTED, $result->outcome);
        $this->assertFalse($result->cleanupExecuted);
        $this->assertFalse($result->categoryCompleted);
    }

    public function test_orchestrator_reports_bookkeeping_failure_and_legacy_execute_returns_false(): void
    {
        $user = User::factory()->create();
        $log = $this->createLog($user);
        $manifest = $this->inProgressManifest($user);
        $manifestService = Mockery::mock(AccountDeleteCleanupManifestService::class);
        $manifestService->shouldReceive('markCategoryCompleted')
            ->twice()
            ->with(Mockery::on(
                fn (AccountDeleteCleanupManifest $argument): bool => $argument->getKey() === $manifest->getKey(),
            ), 'activity_logs')
            ->andReturnFalse();
        $orchestrator = new AccountDeleteActivityLogsCleanupOrchestrator(
            app(AccountDeleteActivityLogsCleanupService::class),
            $manifestService,
        );

        $result = $orchestrator->executeWithResult($manifest);

        $this->assertSame(AccountDeleteCleanupCategoryExecutionResult::OUTCOME_BOOKKEEPING_FAILED, $result->outcome);
        $this->assertTrue($result->cleanupExecuted);
        $this->assertFalse($result->categoryCompleted);
        $this->assertFalse($orchestrator->execute($manifest));
        $this->assertNull(ActivityLog::query()->find($log->getKey()));
    }

    private function inProgressManifest(User $user): AccountDeleteCleanupManifest
    {
        $manifestService = app(AccountDeleteCleanupManifestService::class);
        $manifest = $manifestService->createForUser($user);
        $this->assertTrue($manifestService->beginAttempt($manifest));

        return AccountDeleteCleanupManifest::query()->findOrFail($manifest->getKey());
    }

    private function createLog(User $user): ActivityLog
    {
        return ActivityLog::query()->create([
            'user_id' => $user->getKey(),
            'action' => 'auth.login',
            'description' => 'Successful login',
        ]);
    }
}

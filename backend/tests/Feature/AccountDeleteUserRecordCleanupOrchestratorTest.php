<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\AccountDeleteCleanupManifest;
use App\Models\User;
use App\Services\AccountDeleteCleanupCategoryExecutionResult;
use App\Services\AccountDeleteCleanupManifestService;
use App\Services\AccountDeleteUserRecordCleanupOrchestrator;
use App\Services\AccountDeleteUserRecordCleanupService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class AccountDeleteUserRecordCleanupOrchestratorTest extends TestCase
{
    use RefreshDatabase;

    public function test_orchestrator_deletes_user_and_completes_the_manifest(): void
    {
        $subject = User::factory()->create();
        $manifest = $this->eligibleManifest($subject);

        $result = app(AccountDeleteUserRecordCleanupOrchestrator::class)->executeWithResult($manifest);

        $this->assertSame('user_record', $result->category);
        $this->assertSame(AccountDeleteCleanupCategoryExecutionResult::OUTCOME_COMPLETED, $result->outcome);
        $this->assertTrue($result->cleanupExecuted);
        $this->assertTrue($result->categoryCompleted);
        $this->assertNull(User::query()->find($subject->getKey()));
        $after = AccountDeleteCleanupManifest::query()->findOrFail($manifest->getKey());
        $this->assertSame('completed', $after->category_states['user_record']);
        $this->assertSame('completed', $after->status);
        $this->assertNotNull($after->completed_at);
        $this->assertNull($after->failure_category);
    }

    public function test_orchestrator_retries_after_user_deletion_when_category_bookkeeping_failed(): void
    {
        $subject = User::factory()->create();
        $manifest = $this->eligibleManifest($subject);
        $manifestService = \Mockery::mock(AccountDeleteCleanupManifestService::class);
        $manifestService->shouldReceive('markCategoryCompleted')
            ->once()
            ->with(\Mockery::on(
                fn (AccountDeleteCleanupManifest $argument): bool => $argument->getKey() === $manifest->getKey(),
            ), 'user_record')
            ->andReturn(false);
        $failedOrchestrator = new AccountDeleteUserRecordCleanupOrchestrator(
            app(AccountDeleteUserRecordCleanupService::class),
            $manifestService,
        );

        $firstResult = $failedOrchestrator->executeWithResult($manifest);
        $afterFailure = AccountDeleteCleanupManifest::query()->findOrFail($manifest->getKey());

        $this->assertSame(AccountDeleteCleanupCategoryExecutionResult::OUTCOME_BOOKKEEPING_FAILED, $firstResult->outcome);
        $this->assertTrue($firstResult->cleanupExecuted);
        $this->assertFalse($firstResult->categoryCompleted);
        $this->assertNull(User::query()->find($subject->getKey()));
        $this->assertSame('in_progress', $afterFailure->status);
        $this->assertSame('pending', $afterFailure->category_states['user_record']);

        $retryResult = app(AccountDeleteUserRecordCleanupOrchestrator::class)->executeWithResult($afterFailure);
        $afterRetry = AccountDeleteCleanupManifest::query()->findOrFail($manifest->getKey());

        $this->assertSame(AccountDeleteCleanupCategoryExecutionResult::OUTCOME_COMPLETED, $retryResult->outcome);
        $this->assertTrue($retryResult->cleanupExecuted);
        $this->assertTrue($retryResult->categoryCompleted);
        $this->assertSame('completed', $afterRetry->category_states['user_record']);
        $this->assertSame('completed', $afterRetry->status);
        $this->assertNotNull($afterRetry->completed_at);
    }

    public function test_orchestrator_retries_overall_completion_after_terminal_category_was_recorded(): void
    {
        $subject = User::factory()->create();
        $manifest = $this->eligibleManifest($subject);
        $realManifestService = app(AccountDeleteCleanupManifestService::class);
        $manifestService = \Mockery::mock(AccountDeleteCleanupManifestService::class);
        $manifestService->shouldReceive('markCategoryCompleted')
            ->once()
            ->andReturnUsing(
                fn (AccountDeleteCleanupManifest $argument, string $category): bool => $realManifestService
                    ->markCategoryCompleted($argument, $category),
            );
        $manifestService->shouldReceive('completeIfAllCategoriesCompleted')
            ->once()
            ->andReturn(false);
        $failingOrchestrator = new AccountDeleteUserRecordCleanupOrchestrator(
            app(AccountDeleteUserRecordCleanupService::class),
            $manifestService,
        );

        $firstResult = $failingOrchestrator->executeWithResult($manifest);
        $afterFailure = AccountDeleteCleanupManifest::query()->findOrFail($manifest->getKey());

        $this->assertSame(AccountDeleteCleanupCategoryExecutionResult::OUTCOME_BOOKKEEPING_FAILED, $firstResult->outcome);
        $this->assertTrue($firstResult->cleanupExecuted);
        $this->assertFalse($firstResult->categoryCompleted);
        $this->assertNull(User::query()->find($subject->getKey()));
        $this->assertSame('completed', $afterFailure->category_states['user_record']);
        $this->assertSame('in_progress', $afterFailure->status);
        $this->assertNull($afterFailure->completed_at);

        $retryResult = app(AccountDeleteUserRecordCleanupOrchestrator::class)->executeWithResult($afterFailure);
        $afterRetry = AccountDeleteCleanupManifest::query()->findOrFail($manifest->getKey());

        $this->assertSame(AccountDeleteCleanupCategoryExecutionResult::OUTCOME_COMPLETED, $retryResult->outcome);
        $this->assertFalse($retryResult->cleanupExecuted);
        $this->assertTrue($retryResult->categoryCompleted);
        $this->assertSame('completed', $afterRetry->status);
        $this->assertNotNull($afterRetry->completed_at);
    }

    public function test_orchestrator_rejects_stale_manifest_and_legacy_execute_returns_true_on_success(): void
    {
        $staleUser = User::factory()->create();
        $staleManifest = app(AccountDeleteCleanupManifestService::class)->createForUser($staleUser);
        $staleManifest->delete();
        $staleResult = app(AccountDeleteUserRecordCleanupOrchestrator::class)->executeWithResult($staleManifest);

        $this->assertSame(AccountDeleteCleanupCategoryExecutionResult::OUTCOME_REJECTED, $staleResult->outcome);
        $this->assertFalse($staleResult->cleanupExecuted);
        $this->assertFalse($staleResult->categoryCompleted);

        $subject = User::factory()->create();
        $manifest = $this->eligibleManifest($subject);
        $this->assertTrue(app(AccountDeleteUserRecordCleanupOrchestrator::class)->execute($manifest));
    }

    private function eligibleManifest(User $user): AccountDeleteCleanupManifest
    {
        $manifestService = app(AccountDeleteCleanupManifestService::class);
        $manifest = $manifestService->createForUser($user);
        $this->assertTrue($manifestService->beginAttempt($manifest));

        foreach (AccountDeleteCleanupManifestService::CLEANUP_CATEGORIES as $category) {
            if ($category !== 'user_record') {
                $this->assertTrue($manifestService->markCategoryCompleted($manifest, $category));
            }
        }

        return AccountDeleteCleanupManifest::query()->findOrFail($manifest->getKey());
    }
}

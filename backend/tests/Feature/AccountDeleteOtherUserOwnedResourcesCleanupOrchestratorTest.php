<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\AccountDeleteCleanupManifest;
use App\Models\User;
use App\Services\AccountDeleteCleanupCategoryExecutionResult;
use App\Services\AccountDeleteCleanupManifestService;
use App\Services\AccountDeleteOtherUserOwnedResourcesCleanupOrchestrator;
use App\Services\AccountDeleteOtherUserOwnedResourcesCleanupService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

final class AccountDeleteOtherUserOwnedResourcesCleanupOrchestratorTest extends TestCase
{
    use RefreshDatabase;

    public function test_orchestrator_completes_category_after_cleanup(): void
    {
        $user = User::factory()->create();
        DB::table('sessions')->insert([
            'id' => 'orchestrator-subject',
            'user_id' => $user->getKey(),
            'payload' => 'payload',
            'last_activity' => now()->timestamp,
        ]);
        $manifest = $this->eligibleManifest($user);

        $result = app(AccountDeleteOtherUserOwnedResourcesCleanupOrchestrator::class)
            ->executeWithResult($manifest);

        $this->assertSame('other_user_owned_resources', $result->category);
        $this->assertSame(AccountDeleteCleanupCategoryExecutionResult::OUTCOME_COMPLETED, $result->outcome);
        $this->assertTrue($result->cleanupExecuted);
        $this->assertTrue($result->categoryCompleted);
        $this->assertDatabaseMissing('sessions', ['id' => 'orchestrator-subject']);
        $this->assertSame(
            'completed',
            AccountDeleteCleanupManifest::query()->findOrFail($manifest->getKey())
                ->category_states['other_user_owned_resources'],
        );
    }

    public function test_orchestrator_rejects_ineligible_manifest(): void
    {
        $user = User::factory()->create();
        DB::table('sessions')->insert([
            'id' => 'orchestrator-pending',
            'user_id' => $user->getKey(),
            'payload' => 'payload',
            'last_activity' => now()->timestamp,
        ]);
        $manifest = app(AccountDeleteCleanupManifestService::class)->createForUser($user);

        $result = app(AccountDeleteOtherUserOwnedResourcesCleanupOrchestrator::class)
            ->executeWithResult($manifest);

        $this->assertSame(AccountDeleteCleanupCategoryExecutionResult::OUTCOME_REJECTED, $result->outcome);
        $this->assertFalse($result->cleanupExecuted);
        $this->assertFalse($result->categoryCompleted);
        $this->assertDatabaseHas('sessions', ['id' => 'orchestrator-pending']);
    }

    public function test_orchestrator_reports_bookkeeping_failure_and_legacy_execute_returns_false(): void
    {
        $user = User::factory()->create();
        $manifest = $this->eligibleManifest($user);
        $manifestService = \Mockery::mock(AccountDeleteCleanupManifestService::class);
        $manifestService->shouldReceive('markCategoryCompleted')
            ->twice()
            ->with(\Mockery::on(
                fn (AccountDeleteCleanupManifest $argument): bool => $argument->getKey() === $manifest->getKey(),
            ), 'other_user_owned_resources')
            ->andReturn(false);
        $orchestrator = new AccountDeleteOtherUserOwnedResourcesCleanupOrchestrator(
            app(AccountDeleteOtherUserOwnedResourcesCleanupService::class),
            $manifestService,
        );

        $result = $orchestrator->executeWithResult($manifest);

        $this->assertSame(AccountDeleteCleanupCategoryExecutionResult::OUTCOME_BOOKKEEPING_FAILED, $result->outcome);
        $this->assertTrue($result->cleanupExecuted);
        $this->assertFalse($result->categoryCompleted);
        $this->assertFalse($orchestrator->execute($manifest));
    }

    public function test_orchestrator_rejects_stale_manifest(): void
    {
        $user = User::factory()->create();
        $manifest = app(AccountDeleteCleanupManifestService::class)->createForUser($user);
        $manifest->delete();

        $result = app(AccountDeleteOtherUserOwnedResourcesCleanupOrchestrator::class)
            ->executeWithResult($manifest);

        $this->assertSame(AccountDeleteCleanupCategoryExecutionResult::OUTCOME_REJECTED, $result->outcome);
        $this->assertFalse($result->cleanupExecuted);
        $this->assertFalse($result->categoryCompleted);
    }

    public function test_legacy_execute_returns_true_after_successful_cleanup(): void
    {
        $user = User::factory()->create();
        $manifest = $this->eligibleManifest($user);

        $this->assertTrue(
            app(AccountDeleteOtherUserOwnedResourcesCleanupOrchestrator::class)->execute($manifest),
        );
    }

    private function eligibleManifest(User $user): AccountDeleteCleanupManifest
    {
        $manifestService = app(AccountDeleteCleanupManifestService::class);
        $manifest = $manifestService->createForUser($user);
        $this->assertTrue($manifestService->beginAttempt($manifest));

        foreach ([
            'share_links',
            'oauth_identities',
            'physical_local_files',
            'database_records',
            'devices',
            'sanctum_tokens',
            'google_drive_credentials',
            'activity_logs',
        ] as $category) {
            $this->assertTrue($manifestService->markCategoryCompleted($manifest, $category));
        }

        return AccountDeleteCleanupManifest::query()->findOrFail($manifest->getKey());
    }
}

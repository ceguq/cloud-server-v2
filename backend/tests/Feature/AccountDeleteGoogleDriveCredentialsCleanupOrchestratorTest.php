<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\AccountDeleteCleanupManifest;
use App\Models\GDriveAccount;
use App\Models\User;
use App\Services\AccountDeleteCleanupCategoryExecutionResult;
use App\Services\AccountDeleteCleanupManifestService;
use App\Services\AccountDeleteGoogleDriveCredentialsCleanupOrchestrator;
use App\Services\AccountDeleteGoogleDriveCredentialsCleanupService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Mockery;
use Tests\TestCase;

final class AccountDeleteGoogleDriveCredentialsCleanupOrchestratorTest extends TestCase
{
    use RefreshDatabase;

    public function test_orchestrator_completes_category_after_successful_cleanup(): void
    {
        Http::fake([
            'https://oauth2.googleapis.com/revoke' => Http::response([], 200),
        ]);
        $user = User::factory()->create();
        $account = $this->createAccount($user);
        $manifest = $this->inProgressManifest($user);

        $result = app(AccountDeleteGoogleDriveCredentialsCleanupOrchestrator::class)
            ->executeWithResult($manifest);

        $this->assertSame('google_drive_credentials', $result->category);
        $this->assertSame(AccountDeleteCleanupCategoryExecutionResult::OUTCOME_COMPLETED, $result->outcome);
        $this->assertTrue($result->cleanupExecuted);
        $this->assertTrue($result->categoryCompleted);
        $this->assertNull(GDriveAccount::query()->find($account->id));
        $this->assertSame(
            'completed',
            AccountDeleteCleanupManifest::query()->findOrFail($manifest->getKey())->category_states['google_drive_credentials'],
        );
    }

    public function test_orchestrator_rejects_stale_manifest(): void
    {
        $user = User::factory()->create();
        $manifest = app(AccountDeleteCleanupManifestService::class)->createForUser($user);
        $manifest->delete();

        $result = app(AccountDeleteGoogleDriveCredentialsCleanupOrchestrator::class)
            ->executeWithResult($manifest);

        $this->assertSame(AccountDeleteCleanupCategoryExecutionResult::OUTCOME_REJECTED, $result->outcome);
        $this->assertFalse($result->cleanupExecuted);
        $this->assertFalse($result->categoryCompleted);
    }

    public function test_orchestrator_reports_bookkeeping_failure_and_legacy_execute_returns_false(): void
    {
        Http::fake([
            'https://oauth2.googleapis.com/revoke' => Http::response([], 200),
        ]);
        $user = User::factory()->create();
        $account = $this->createAccount($user);
        $manifest = $this->inProgressManifest($user);
        $manifestService = Mockery::mock(AccountDeleteCleanupManifestService::class);
        $manifestService->shouldReceive('markCategoryCompleted')
            ->twice()
            ->with(Mockery::on(
                fn (AccountDeleteCleanupManifest $argument): bool => $argument->getKey() === $manifest->getKey(),
            ), 'google_drive_credentials')
            ->andReturnFalse();
        $orchestrator = new AccountDeleteGoogleDriveCredentialsCleanupOrchestrator(
            app(AccountDeleteGoogleDriveCredentialsCleanupService::class),
            $manifestService,
        );

        $result = $orchestrator->executeWithResult($manifest);

        $this->assertSame(AccountDeleteCleanupCategoryExecutionResult::OUTCOME_BOOKKEEPING_FAILED, $result->outcome);
        $this->assertTrue($result->cleanupExecuted);
        $this->assertFalse($result->categoryCompleted);
        $this->assertFalse($orchestrator->execute($manifest));
        $this->assertNull(GDriveAccount::query()->find($account->id));
    }

    private function inProgressManifest(User $user): AccountDeleteCleanupManifest
    {
        $manifestService = app(AccountDeleteCleanupManifestService::class);
        $manifest = $manifestService->createForUser($user);
        $this->assertTrue($manifestService->beginAttempt($manifest));

        return AccountDeleteCleanupManifest::query()->findOrFail($manifest->getKey());
    }

    private function createAccount(User $user): GDriveAccount
    {
        return GDriveAccount::query()->create([
            'user_id' => $user->id,
            'email' => 'drive@example.com',
            'access_token' => 'access-secret',
            'refresh_token' => 'refresh-secret',
        ]);
    }
}

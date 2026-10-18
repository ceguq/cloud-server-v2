<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\AccountDeleteCleanupManifest;
use App\Models\User;
use App\Services\AccountDeleteCleanupCategoryExecutionResult;
use App\Services\AccountDeleteCleanupManifestService;
use App\Services\AccountDeleteSanctumTokensCleanupOrchestrator;
use App\Services\AccountDeleteSanctumTokensCleanupService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\PersonalAccessToken;
use Laravel\Sanctum\Sanctum;
use Mockery;
use Tests\TestCase;

final class AccountDeleteSanctumTokensCleanupOrchestratorBookkeepingFailureTest extends TestCase
{
    use RefreshDatabase;

    public function test_sanctum_tokens_cleanup_orchestrator_returns_bookkeeping_failed_after_successful_cleanup(): void
    {
        $subjectUser = User::factory()->create([
            'email' => 'account-delete-sanctum-bookkeeping-subject@example.com',
            'password' => null,
        ]);

        $protectedUser = User::factory()->create([
            'email' => 'account-delete-sanctum-bookkeeping-protected@example.com',
            'password' => null,
        ]);

        $this->assertDatabaseHas('users', ['id' => $subjectUser->id]);
        $this->assertDatabaseHas('users', ['id' => $protectedUser->id]);

        // Create 3 subject tokens.
        $subjectCurrentToken = $subjectUser->createToken('account-delete-sanctum-bookkeeping-current-token');
        $subjectOlderTokenOne = $subjectUser->createToken('account-delete-sanctum-bookkeeping-older-token-one');
        $subjectOlderTokenTwo = $subjectUser->createToken('account-delete-sanctum-bookkeeping-older-token-two');

        $subjectCurrentTokenId = (int) $subjectCurrentToken->accessToken->getKey();
        $subjectOlderTokenOneId = (int) $subjectOlderTokenOne->accessToken->getKey();
        $subjectOlderTokenTwoId = (int) $subjectOlderTokenTwo->accessToken->getKey();

        $userMorphType = $subjectUser->getMorphClass();

        foreach ([$subjectCurrentTokenId, $subjectOlderTokenOneId, $subjectOlderTokenTwoId] as $tokenId) {
            $this->assertDatabaseHas('personal_access_tokens', [
                'id' => $tokenId,
                'tokenable_type' => $userMorphType,
                'tokenable_id' => $subjectUser->id,
            ]);
        }

        // Create 1 protected token.
        Sanctum::actingAs($protectedUser);
        $protectedToken = $protectedUser->createToken('account-delete-sanctum-bookkeeping-protected-token');
        $protectedTokenId = (int) $protectedToken->accessToken->getKey();

        $this->assertDatabaseHas('personal_access_tokens', [
            'id' => $protectedTokenId,
            'tokenable_type' => $protectedUser->getMorphClass(),
            'tokenable_id' => $protectedUser->id,
        ]);

        $protectedTokenRow = (object) ($protectedUser->tokens()->where('id', $protectedTokenId)->first());

        $protectedTokenCaptured = [
            'id' => (int) $protectedTokenRow->id,
            'tokenable_type' => (string) $protectedTokenRow->tokenable_type,
            'tokenable_id' => (int) $protectedTokenRow->tokenable_id,
            'name' => (string) $protectedTokenRow->name,
            'abilities' => $protectedTokenRow->abilities,
            'last_used_at' => $protectedTokenRow->last_used_at,
            'expires_at' => $protectedTokenRow->expires_at,
            'created_at' => $protectedTokenRow->created_at,
            'updated_at' => $protectedTokenRow->updated_at,
        ];

        // Real manifest setup.
        $realManifestService = app(AccountDeleteCleanupManifestService::class);
        $manifest = $realManifestService->createForUser($subjectUser);

        $this->assertTrue(
            $realManifestService->beginAttempt($manifest),
        );

        $inProgressManifest = AccountDeleteCleanupManifest::query()
            ->findOrFail($manifest->getKey());

        $this->assertSame('in_progress', $inProgressManifest->status);
        $this->assertSame(1, (int) $inProgressManifest->attempt_count);
        $this->assertNull($inProgressManifest->completed_at);
        $this->assertNull($inProgressManifest->failure_category);
        $this->assertSame('pending', $inProgressManifest->category_states['sanctum_tokens']);

        foreach (
            [
                'database_records',
                'physical_local_files',
                'share_links',
                'devices',
                'oauth_identities',
                'google_drive_credentials',
                'activity_logs',
                'user_record',
                'other_user_owned_resources',
            ] as $category
        ) {
            $this->assertSame('pending', $inProgressManifest->category_states[$category]);
        }

        // Capture pre-orchestration baseline.
        $baseline = [
            'operation_id' => $inProgressManifest->operation_id,
            'subject_user_id' => $inProgressManifest->subject_user_id,
            'ownership_snapshot' => $inProgressManifest->ownership_snapshot,
            'category_states' => $inProgressManifest->category_states,
            'status' => $inProgressManifest->status,
            'attempt_count' => (int) $inProgressManifest->attempt_count,
            'last_attempt_at' => $inProgressManifest->last_attempt_at,
            'completed_at' => $inProgressManifest->completed_at,
            'failure_category' => $inProgressManifest->failure_category,
            'created_at' => $inProgressManifest->created_at,
            'updated_at' => $inProgressManifest->updated_at,
        ];

        // Real cleanup service.
        $cleanupService = app(AccountDeleteSanctumTokensCleanupService::class);

        // Mocked manifest service for forced bookkeeping failure.
        $bookkeepingManifestService = Mockery::mock(AccountDeleteCleanupManifestService::class);

        $bookkeepingManifestService
            ->shouldReceive('markCategoryCompleted')
            ->once()
            ->withArgs(
                function (
                    AccountDeleteCleanupManifest $receivedManifest,
                    string $category,
                ) use ($inProgressManifest): bool {
                    return $receivedManifest === $inProgressManifest
                        && $category === 'sanctum_tokens';
                },
            )
            ->andReturnFalse();

        // Direct orchestrator construction.
        $orchestrator = new AccountDeleteSanctumTokensCleanupOrchestrator(
            $cleanupService,
            $bookkeepingManifestService,
        );

        $result = $orchestrator->executeWithResult(
            $inProgressManifest,
        );

        // Shared result assertions.
        $this->assertInstanceOf(AccountDeleteCleanupCategoryExecutionResult::class, $result);

        $this->assertSame('sanctum_tokens', $result->category);
        $this->assertSame(AccountDeleteCleanupCategoryExecutionResult::OUTCOME_BOOKKEEPING_FAILED, $result->outcome);
        $this->assertTrue($result->cleanupExecuted);
        $this->assertFalse($result->categoryCompleted);

        // Subject tokens must be deleted even though bookkeeping failed.
        $this->assertNull(PersonalAccessToken::query()->find($subjectCurrentTokenId));
        $this->assertNull(PersonalAccessToken::query()->find($subjectOlderTokenOneId));
        $this->assertNull(PersonalAccessToken::query()->find($subjectOlderTokenTwoId));

        $this->assertSame(
            0,
            PersonalAccessToken::query()
                ->where('tokenable_type', $subjectUser->getMorphClass())
                ->where('tokenable_id', (int) $subjectUser->id)
                ->count(),
        );

        // Protected token preserved.
        $protectedAfter = PersonalAccessToken::query()->find($protectedTokenId);
        $this->assertNotNull($protectedAfter);

        $this->assertSame($protectedTokenCaptured['id'], (int) $protectedAfter->id);
        $this->assertSame($protectedTokenCaptured['tokenable_type'], (string) $protectedAfter->tokenable_type);
        $this->assertSame($protectedTokenCaptured['tokenable_id'], (int) $protectedAfter->tokenable_id);
        $this->assertSame($protectedTokenCaptured['name'], (string) $protectedAfter->name);
        $this->assertSame($protectedTokenCaptured['abilities'], $protectedAfter->abilities);
        $this->assertEquals($protectedTokenCaptured['last_used_at'], $protectedAfter->last_used_at);
        $this->assertEquals($protectedTokenCaptured['expires_at'], $protectedAfter->expires_at);
        $this->assertEquals($protectedTokenCaptured['created_at'], $protectedAfter->created_at);
        $this->assertEquals($protectedTokenCaptured['updated_at'], $protectedAfter->updated_at);

        // Users remain.
        $this->assertNotNull(User::query()->find($subjectUser->id));
        $this->assertNotNull(User::query()->find($protectedUser->id));

        // Manifest must remain completely unchanged after bookkeeping failure.
        $afterManifest = AccountDeleteCleanupManifest::query()->find($inProgressManifest->getKey());
        $this->assertNotNull($afterManifest);

        $afterManifestReloaded = $afterManifest->fresh();

        $this->assertSame('in_progress', $afterManifestReloaded->status);
        $this->assertSame(1, (int) $afterManifestReloaded->attempt_count);
        $this->assertNull($afterManifestReloaded->completed_at);
        $this->assertNull($afterManifestReloaded->failure_category);
        $this->assertSame('pending', $afterManifestReloaded->category_states['sanctum_tokens']);

        foreach (
            [
                'database_records',
                'physical_local_files',
                'share_links',
                'devices',
                'oauth_identities',
                'google_drive_credentials',
                'activity_logs',
                'user_record',
                'other_user_owned_resources',
            ] as $category
        ) {
            $this->assertSame('pending', $afterManifestReloaded->category_states[$category]);
        }

        $this->assertSame($baseline['operation_id'], $afterManifestReloaded->operation_id);
        $this->assertSame($baseline['subject_user_id'], $afterManifestReloaded->subject_user_id);
        $this->assertSame($baseline['ownership_snapshot'], $afterManifestReloaded->ownership_snapshot);
        $this->assertSame($baseline['status'], $afterManifestReloaded->status);
        $this->assertSame($baseline['attempt_count'], (int) $afterManifestReloaded->attempt_count);
        $this->assertEquals($baseline['last_attempt_at'], $afterManifestReloaded->last_attempt_at);
        $this->assertNull($afterManifestReloaded->completed_at);
        $this->assertNull($afterManifestReloaded->failure_category);
        $this->assertEquals($baseline['created_at'], $afterManifestReloaded->created_at);
        $this->assertEquals($baseline['updated_at'], $afterManifestReloaded->updated_at);
        $this->assertEquals($baseline['category_states'], $afterManifestReloaded->category_states);
    }
}

<?php

namespace Tests\Feature;

use App\Models\AccountDeleteCleanupManifest;
use App\Models\User;
use App\Services\AccountDeleteCleanupCategoryExecutionResult;
use App\Services\AccountDeleteCleanupManifestService as ManifestService;
use App\Services\AccountDeleteSanctumTokensCleanupOrchestrator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\PersonalAccessToken;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AccountDeleteSanctumTokensCleanupOrchestratorTest extends TestCase
{
    use RefreshDatabase;

    public function test_sanctum_tokens_cleanup_orchestrator_completes_category_after_successful_cleanup(): void
    {
        $subjectUser = User::factory()->create([
            'email' => 'account-delete-sanctum-orchestrator-subject@example.com',
            'password' => null,
        ]);

        $protectedUser = User::factory()->create([
            'email' => 'account-delete-sanctum-orchestrator-protected@example.com',
            'password' => null,
        ]);

        $subjectCurrentToken = $subjectUser->createToken('account-delete-sanctum-orchestrator-current-token');
        $subjectOlderTokenOne = $subjectUser->createToken('account-delete-sanctum-orchestrator-older-token-one');
        $subjectOlderTokenTwo = $subjectUser->createToken('account-delete-sanctum-orchestrator-older-token-two');

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

        Sanctum::actingAs($protectedUser);
        $protectedToken = $protectedUser->createToken('account-delete-sanctum-orchestrator-protected-token');
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

        $manifestService = app(ManifestService::class);
        $manifest = $manifestService->createForUser($subjectUser);

        $this->assertTrue(
            $manifestService->beginAttempt($manifest),
        );

        $inProgressManifest = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($inProgressManifest);

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

        $operationId = $inProgressManifest->operation_id;
        $subjectUserIdCaptured = $inProgressManifest->subject_user_id;
        $ownershipSnapshot = $inProgressManifest->ownership_snapshot;
        $status = $inProgressManifest->status;
        $attemptCount = (int) $inProgressManifest->attempt_count;
        $lastAttemptAt = $inProgressManifest->last_attempt_at;
        $completedAt = $inProgressManifest->completed_at;
        $failureCategory = $inProgressManifest->failure_category;
        $createdAt = $inProgressManifest->created_at;

        $orchestrator = app(
            AccountDeleteSanctumTokensCleanupOrchestrator::class,
        );

        $result = $orchestrator->executeWithResult(
            $inProgressManifest,
        );

        $this->assertInstanceOf(AccountDeleteCleanupCategoryExecutionResult::class, $result);

        $this->assertSame('sanctum_tokens', $result->category);
        $this->assertSame(AccountDeleteCleanupCategoryExecutionResult::OUTCOME_COMPLETED, $result->outcome);
        $this->assertTrue($result->cleanupExecuted);
        $this->assertTrue($result->categoryCompleted);

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

        $this->assertNotNull(User::query()->find($subjectUser->id));
        $this->assertNotNull(User::query()->find($protectedUser->id));

        $afterManifest = AccountDeleteCleanupManifest::query()->find($inProgressManifest->getKey());
        $this->assertNotNull($afterManifest);

        $afterManifestReloaded = $afterManifest->fresh();

        $this->assertSame('in_progress', $afterManifestReloaded->status);
        $this->assertSame(1, (int) $afterManifestReloaded->attempt_count);
        $this->assertNull($afterManifestReloaded->completed_at);
        $this->assertNull($afterManifestReloaded->failure_category);
        $this->assertSame('completed', $afterManifestReloaded->category_states['sanctum_tokens']);

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

        $this->assertSame($operationId, $afterManifestReloaded->operation_id);
        $this->assertSame($subjectUserIdCaptured, $afterManifestReloaded->subject_user_id);
        $this->assertSame($ownershipSnapshot, $afterManifestReloaded->ownership_snapshot);
        $this->assertSame($status, $afterManifestReloaded->status);
        $this->assertSame($attemptCount, (int) $afterManifestReloaded->attempt_count);
        $this->assertEquals($lastAttemptAt, $afterManifestReloaded->last_attempt_at);
        $this->assertNull($completedAt);
        $this->assertNull($failureCategory);
        $this->assertEquals($createdAt, $afterManifestReloaded->created_at);
    }
}

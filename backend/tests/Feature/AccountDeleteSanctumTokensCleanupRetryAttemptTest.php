<?php

namespace Tests\Feature;

use App\Models\AccountDeleteCleanupManifest;
use App\Models\User;
use App\Services\AccountDeleteCleanupManifestService;
use App\Services\AccountDeleteSanctumTokensCleanupResult;
use App\Services\AccountDeleteSanctumTokensCleanupService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\PersonalAccessToken;
use Tests\TestCase;

class AccountDeleteSanctumTokensCleanupRetryAttemptTest extends TestCase
{
    use RefreshDatabase;

    public function test_sanctum_tokens_cleanup_executes_after_explicit_retry_attempt(): void
    {
        $subjectUser = User::factory()->create([
            'email' => 'account-delete-sanctum-retry-subject@example.com',
            'password' => null,
        ]);

        $protectedUser = User::factory()->create([
            'email' => 'account-delete-sanctum-retry-protected@example.com',
            'password' => null,
        ]);

        $subjectCurrentToken = $subjectUser->createToken('account-delete-sanctum-retry-current-token');
        $subjectOlderTokenOne = $subjectUser->createToken('account-delete-sanctum-retry-older-token-one');
        $subjectOlderTokenTwo = $subjectUser->createToken('account-delete-sanctum-retry-older-token-two');

        $subjectCurrentTokenId = (int) $subjectCurrentToken->accessToken->getKey();
        $subjectOlderTokenOneId = (int) $subjectOlderTokenOne->accessToken->getKey();
        $subjectOlderTokenTwoId = (int) $subjectOlderTokenTwo->accessToken->getKey();

        foreach ([$subjectCurrentTokenId, $subjectOlderTokenOneId, $subjectOlderTokenTwoId] as $tokenId) {
            $this->assertDatabaseHas('personal_access_tokens', [
                'id' => $tokenId,
                'tokenable_id' => $subjectUser->id,
                'tokenable_type' => $subjectUser->getMorphClass(),
            ]);
        }

        $protectedToken = $protectedUser->createToken('account-delete-sanctum-retry-protected-token');
        $protectedTokenId = (int) $protectedToken->accessToken->getKey();

        $this->assertDatabaseHas('personal_access_tokens', [
            'id' => $protectedTokenId,
            'tokenable_id' => $protectedUser->id,
            'tokenable_type' => $protectedUser->getMorphClass(),
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

        $manifestService = app(AccountDeleteCleanupManifestService::class);

        $manifest = $manifestService->createForUser($subjectUser);

        $this->assertTrue(
            $manifestService->beginAttempt($manifest),
        );

        $inProgressManifest = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($inProgressManifest);

        $this->assertSame('in_progress', $inProgressManifest->status);
        $this->assertSame(1, (int) $inProgressManifest->attempt_count);
        $this->assertNull($inProgressManifest->failure_category);
        $this->assertSame('pending', $inProgressManifest->category_states['sanctum_tokens']);

        $this->assertTrue(
            $manifestService->markCategoryFailed(
                $inProgressManifest,
                'sanctum_tokens',
            ),
        );

        $failedManifest = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($failedManifest);

        $this->assertSame('cleanup_pending', $failedManifest->status);
        $this->assertSame(1, (int) $failedManifest->attempt_count);
        $this->assertNull($failedManifest->completed_at);
        $this->assertSame('sanctum_tokens', $failedManifest->failure_category);
        $this->assertSame('failed', $failedManifest->category_states['sanctum_tokens']);

        foreach ($failedManifest->category_states as $category => $state) {
            if ($category === 'sanctum_tokens') {
                continue;
            }
            $this->assertSame('pending', $state);
        }

        $this->assertTrue(
            $manifestService->beginRetryAttempt(
                $failedManifest,
            ),
        );

        $retryManifest = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($retryManifest);

        $this->assertSame('in_progress', $retryManifest->status);
        $this->assertSame(2, (int) $retryManifest->attempt_count);
        $this->assertNull($retryManifest->completed_at);
        $this->assertNull($retryManifest->failure_category);
        $this->assertSame('pending', $retryManifest->category_states['sanctum_tokens']);

        $this->assertNotNull($retryManifest->last_attempt_at);

        $baseline = [
            'operation_id' => $retryManifest->operation_id,
            'subject_user_id' => $retryManifest->subject_user_id,
            'ownership_snapshot' => $retryManifest->ownership_snapshot,
            'category_states' => $retryManifest->category_states,
            'status' => $retryManifest->status,
            'attempt_count' => (int) $retryManifest->attempt_count,
            'last_attempt_at' => $retryManifest->last_attempt_at,
            'completed_at' => $retryManifest->completed_at,
            'failure_category' => $retryManifest->failure_category,
            'created_at' => $retryManifest->created_at,
            'updated_at' => $retryManifest->updated_at,
        ];

        $service = app(AccountDeleteSanctumTokensCleanupService::class);

        $result = $service->cleanupWithResult(
            $retryManifest,
        );

        $this->assertInstanceOf(AccountDeleteSanctumTokensCleanupResult::class, $result);
        $this->assertTrue($result->executed);
        $this->assertSame(3, $result->deletedCount);

        $this->assertNull(PersonalAccessToken::query()->find($subjectCurrentTokenId));
        $this->assertNull(PersonalAccessToken::query()->find($subjectOlderTokenOneId));
        $this->assertNull(PersonalAccessToken::query()->find($subjectOlderTokenTwoId));

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

        $this->assertDatabaseHas('users', ['id' => $subjectUser->id]);
        $this->assertDatabaseHas('users', ['id' => $protectedUser->id]);

        $afterManifest = AccountDeleteCleanupManifest::query()->find($retryManifest->getKey());
        $this->assertNotNull($afterManifest);
        $afterManifestReloaded = $afterManifest->fresh();

        $this->assertSame('in_progress', $afterManifestReloaded->status);
        $this->assertSame(2, (int) $afterManifestReloaded->attempt_count);
        $this->assertNull($afterManifestReloaded->completed_at);
        $this->assertNull($afterManifestReloaded->failure_category);
        $this->assertSame('pending', $afterManifestReloaded->category_states['sanctum_tokens']);

        foreach ($afterManifestReloaded->category_states as $category => $state) {
            if ($category === 'sanctum_tokens') {
                continue;
            }
            $this->assertSame('pending', $state);
        }

        $this->assertEquals($baseline['last_attempt_at'], $afterManifestReloaded->last_attempt_at);
        $this->assertEquals($baseline['updated_at'], $afterManifestReloaded->updated_at);
        $this->assertEquals($baseline['created_at'], $afterManifestReloaded->created_at);

        $this->assertSame('pending', $afterManifestReloaded->category_states['sanctum_tokens']);
    }
}

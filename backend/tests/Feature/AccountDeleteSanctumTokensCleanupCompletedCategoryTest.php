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

class AccountDeleteSanctumTokensCleanupCompletedCategoryTest extends TestCase
{
    use RefreshDatabase;

    public function test_sanctum_tokens_cleanup_rejects_completed_category_without_deleting_tokens(): void
    {
        $subjectUser = User::factory()->create([
            'email' => 'account-delete-sanctum-completed-subject@example.com',
            'password' => null,
        ]);

        $protectedUser = User::factory()->create([
            'email' => 'account-delete-sanctum-completed-protected@example.com',
            'password' => null,
        ]);

        $this->assertDatabaseHas('users', ['id' => $subjectUser->id]);
        $this->assertDatabaseHas('users', ['id' => $protectedUser->id]);

        $subjectCurrentToken = $subjectUser->createToken('account-delete-sanctum-completed-current-token');
        $subjectOlderTokenOne = $subjectUser->createToken('account-delete-sanctum-completed-older-token-one');
        $subjectOlderTokenTwo = $subjectUser->createToken('account-delete-sanctum-completed-older-token-two');

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

        $subjectTokenRows = [
            $subjectCurrentTokenId => (object) ($subjectUser->tokens()->where('id', $subjectCurrentTokenId)->first()),
            $subjectOlderTokenOneId => (object) ($subjectUser->tokens()->where('id', $subjectOlderTokenOneId)->first()),
            $subjectOlderTokenTwoId => (object) ($subjectUser->tokens()->where('id', $subjectOlderTokenTwoId)->first()),
        ];

        $subjectTokenCaptured = [];
        foreach ($subjectTokenRows as $tokenId => $row) {
            $subjectTokenCaptured[$tokenId] = [
                'id' => (int) $row->id,
                'tokenable_type' => (string) $row->tokenable_type,
                'tokenable_id' => (int) $row->tokenable_id,
                'name' => (string) $row->name,
                'abilities' => $row->abilities,
                'last_used_at' => $row->last_used_at,
                'expires_at' => $row->expires_at,
                'created_at' => $row->created_at,
                'updated_at' => $row->updated_at,
            ];
        }

        $protectedToken = $protectedUser->createToken('account-delete-sanctum-completed-protected-token');
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

        $started = $manifestService->beginAttempt($manifest);
        $this->assertTrue($started);

        $inProgressManifest = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($inProgressManifest);

        $this->assertSame('in_progress', $inProgressManifest->status);
        $this->assertSame(1, (int) $inProgressManifest->attempt_count);
        $this->assertNull($inProgressManifest->completed_at);
        $this->assertNull($inProgressManifest->failure_category);
        $this->assertSame('pending', $inProgressManifest->category_states['sanctum_tokens']);

        $markedCompleted = $manifestService->markCategoryCompleted(
            $inProgressManifest,
            'sanctum_tokens',
        );

        $this->assertTrue($markedCompleted);

        $completedManifest = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($completedManifest);

        $this->assertSame('in_progress', $completedManifest->status);
        $this->assertSame(1, (int) $completedManifest->attempt_count);
        $this->assertNull($completedManifest->completed_at);
        $this->assertNull($completedManifest->failure_category);
        $this->assertSame('completed', $completedManifest->category_states['sanctum_tokens']);

        foreach (
            $completedManifest->category_states as $category => $state
        ) {
            if ($category === 'sanctum_tokens') {
                continue;
            }
            $this->assertSame('pending', $state);
        }

        $baseline = [
            'operation_id' => $completedManifest->operation_id,
            'subject_user_id' => $completedManifest->subject_user_id,
            'ownership_snapshot' => $completedManifest->ownership_snapshot,
            'category_states' => $completedManifest->category_states,
            'status' => $completedManifest->status,
            'attempt_count' => (int) $completedManifest->attempt_count,
            'last_attempt_at' => $completedManifest->last_attempt_at,
            'completed_at' => $completedManifest->completed_at,
            'failure_category' => $completedManifest->failure_category,
            'created_at' => $completedManifest->created_at,
            'updated_at' => $completedManifest->updated_at,
        ];

        $service = app(AccountDeleteSanctumTokensCleanupService::class);
        $result = $service->cleanupWithResult($completedManifest);

        $this->assertInstanceOf(AccountDeleteSanctumTokensCleanupResult::class, $result);
        $this->assertFalse($result->executed);
        $this->assertSame(0, $result->deletedCount);

        foreach ($subjectTokenCaptured as $tokenId => $captured) {
            $afterToken = PersonalAccessToken::query()->find($tokenId);
            $this->assertNotNull($afterToken);

            $this->assertSame($captured['id'], (int) $afterToken->id);
            $this->assertSame($captured['tokenable_type'], (string) $afterToken->tokenable_type);
            $this->assertSame($captured['tokenable_id'], (int) $afterToken->tokenable_id);
            $this->assertSame($captured['name'], (string) $afterToken->name);
            $this->assertSame($captured['abilities'], $afterToken->abilities);
            $this->assertEquals($captured['last_used_at'], $afterToken->last_used_at);
            $this->assertEquals($captured['expires_at'], $afterToken->expires_at);
            $this->assertEquals($captured['created_at'], $afterToken->created_at);
            $this->assertEquals($captured['updated_at'], $afterToken->updated_at);
        }

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

        $afterManifest = AccountDeleteCleanupManifest::query()->find($completedManifest->getKey());
        $this->assertNotNull($afterManifest);
        $afterManifestReloaded = $afterManifest->fresh();

        $this->assertSame($baseline['status'], $afterManifestReloaded->status);
        $this->assertSame($baseline['attempt_count'], (int) $afterManifestReloaded->attempt_count);
        $this->assertNull($afterManifestReloaded->completed_at);
        $this->assertNull($afterManifestReloaded->failure_category);
        $this->assertSame($baseline['category_states'], $afterManifestReloaded->category_states);

        $this->assertEquals($baseline['created_at'], $afterManifestReloaded->created_at);
        $this->assertEquals($baseline['updated_at'], $afterManifestReloaded->updated_at);
    }
}

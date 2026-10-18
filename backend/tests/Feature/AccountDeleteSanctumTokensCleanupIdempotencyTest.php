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

class AccountDeleteSanctumTokensCleanupIdempotencyTest extends TestCase
{
    use RefreshDatabase;

    public function test_sanctum_tokens_cleanup_is_idempotent_before_category_bookkeeping(): void
    {
        $subjectUser = User::factory()->create([
            'email' => 'account-delete-sanctum-idempotent-subject@example.com',
            'password' => null,
        ]);

        $protectedUser = User::factory()->create([
            'email' => 'account-delete-sanctum-idempotent-protected@example.com',
            'password' => null,
        ]);

        $this->assertDatabaseHas('users', ['id' => $subjectUser->id]);
        $this->assertDatabaseHas('users', ['id' => $protectedUser->id]);

        $subjectCurrentToken = $subjectUser->createToken('account-delete-sanctum-idempotent-current-token');
        $subjectOlderTokenOne = $subjectUser->createToken('account-delete-sanctum-idempotent-older-token-one');
        $subjectOlderTokenTwo = $subjectUser->createToken('account-delete-sanctum-idempotent-older-token-two');

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

        $protectedToken = $protectedUser->createToken('account-delete-sanctum-idempotent-protected-token');
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

        $service = app(AccountDeleteSanctumTokensCleanupService::class);

        $firstResult = $service->cleanupWithResult($inProgressManifest);
        $this->assertInstanceOf(AccountDeleteSanctumTokensCleanupResult::class, $firstResult);
        $this->assertTrue($firstResult->executed);
        $this->assertSame(3, $firstResult->deletedCount);

        $this->assertNull(PersonalAccessToken::query()->find($subjectCurrentTokenId));
        $this->assertNull(PersonalAccessToken::query()->find($subjectOlderTokenOneId));
        $this->assertNull(PersonalAccessToken::query()->find($subjectOlderTokenTwoId));

        $protectedAfterFirst = PersonalAccessToken::query()->find($protectedTokenId);
        $this->assertNotNull($protectedAfterFirst);
        $this->assertSame($protectedTokenCaptured['id'], (int) $protectedAfterFirst->id);
        $this->assertSame($protectedTokenCaptured['tokenable_type'], (string) $protectedAfterFirst->tokenable_type);
        $this->assertSame($protectedTokenCaptured['tokenable_id'], (int) $protectedAfterFirst->tokenable_id);
        $this->assertSame($protectedTokenCaptured['name'], (string) $protectedAfterFirst->name);
        $this->assertSame($protectedTokenCaptured['abilities'], $protectedAfterFirst->abilities);
        $this->assertEquals($protectedTokenCaptured['last_used_at'], $protectedAfterFirst->last_used_at);
        $this->assertEquals($protectedTokenCaptured['expires_at'], $protectedAfterFirst->expires_at);
        $this->assertEquals($protectedTokenCaptured['created_at'], $protectedAfterFirst->created_at);
        $this->assertEquals($protectedTokenCaptured['updated_at'], $protectedAfterFirst->updated_at);

        $secondResult = $service->cleanupWithResult($inProgressManifest);
        $this->assertInstanceOf(AccountDeleteSanctumTokensCleanupResult::class, $secondResult);
        $this->assertTrue($secondResult->executed);
        $this->assertSame(0, $secondResult->deletedCount);

        $this->assertNull(PersonalAccessToken::query()->find($subjectCurrentTokenId));
        $this->assertNull(PersonalAccessToken::query()->find($subjectOlderTokenOneId));
        $this->assertNull(PersonalAccessToken::query()->find($subjectOlderTokenTwoId));

        $protectedAfterSecond = PersonalAccessToken::query()->find($protectedTokenId);
        $this->assertNotNull($protectedAfterSecond);
        $this->assertSame($protectedTokenCaptured['id'], (int) $protectedAfterSecond->id);
        $this->assertSame($protectedTokenCaptured['tokenable_type'], (string) $protectedAfterSecond->tokenable_type);
        $this->assertSame($protectedTokenCaptured['tokenable_id'], (int) $protectedAfterSecond->tokenable_id);
        $this->assertSame($protectedTokenCaptured['name'], (string) $protectedAfterSecond->name);
        $this->assertSame($protectedTokenCaptured['abilities'], $protectedAfterSecond->abilities);
        $this->assertEquals($protectedTokenCaptured['last_used_at'], $protectedAfterSecond->last_used_at);
        $this->assertEquals($protectedTokenCaptured['expires_at'], $protectedAfterSecond->expires_at);
        $this->assertEquals($protectedTokenCaptured['created_at'], $protectedAfterSecond->created_at);
        $this->assertEquals($protectedTokenCaptured['updated_at'], $protectedAfterSecond->updated_at);

        $this->assertDatabaseHas('users', ['id' => $subjectUser->id]);
        $this->assertDatabaseHas('users', ['id' => $protectedUser->id]);

        $afterManifest = AccountDeleteCleanupManifest::query()->find($inProgressManifest->getKey());
        $this->assertNotNull($afterManifest);
        $afterManifestReloaded = $afterManifest->fresh();

        $this->assertSame($baseline['operation_id'], $afterManifestReloaded->operation_id);
        $this->assertSame($baseline['subject_user_id'], $afterManifestReloaded->subject_user_id);
        $this->assertSame($baseline['ownership_snapshot'], $afterManifestReloaded->ownership_snapshot);
        $this->assertSame($baseline['category_states'], $afterManifestReloaded->category_states);
        $this->assertSame($baseline['status'], $afterManifestReloaded->status);
        $this->assertSame($baseline['attempt_count'], (int) $afterManifestReloaded->attempt_count);
        $this->assertEquals($baseline['last_attempt_at'], $afterManifestReloaded->last_attempt_at);
        $this->assertNull($afterManifestReloaded->completed_at);
        $this->assertNull($afterManifestReloaded->failure_category);
        $this->assertEquals($baseline['created_at'], $afterManifestReloaded->created_at);
        $this->assertEquals($baseline['updated_at'], $afterManifestReloaded->updated_at);

        $this->assertSame('pending', $afterManifestReloaded->category_states['sanctum_tokens']);
    }
}

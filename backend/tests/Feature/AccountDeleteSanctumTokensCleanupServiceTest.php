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

class AccountDeleteSanctumTokensCleanupServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_sanctum_tokens_cleanup_deletes_all_subject_tokens_and_preserves_protected_tokens(): void
    {
        $subjectUser = User::factory()->create([
            'email' => 'account-delete-sanctum-current-subject@example.com',
            'password' => null,
        ]);

        $protectedUser = User::factory()->create([
            'email' => 'account-delete-sanctum-protected@example.com',
            'password' => null,
        ]);

        $this->assertDatabaseHas('users', ['id' => $subjectUser->id]);
        $this->assertDatabaseHas('users', ['id' => $protectedUser->id]);

        // Subject tokens: current deletion-request token + 2 older tokens.
        $subjectCurrentToken = $subjectUser->createToken('account-delete-sanctum-current-token');
        $subjectOlderTokenOne = $subjectUser->createToken('account-delete-sanctum-older-token-one');
        $subjectOlderTokenTwo = $subjectUser->createToken('account-delete-sanctum-older-token-two');

        $subjectCurrentTokenId = (int) $subjectCurrentToken->accessToken->getKey();
        $subjectOlderTokenOneId = (int) $subjectOlderTokenOne->accessToken->getKey();
        $subjectOlderTokenTwoId = (int) $subjectOlderTokenTwo->accessToken->getKey();

        $this->assertDatabaseHas('personal_access_tokens', ['id' => $subjectCurrentTokenId]);
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $subjectOlderTokenOneId]);
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $subjectOlderTokenTwoId]);

        $this->assertDatabaseHas('personal_access_tokens', [
            'id' => $subjectCurrentTokenId,
            'tokenable_id' => $subjectUser->id,
            'tokenable_type' => $subjectUser->getMorphClass(),
        ]);

        $this->assertDatabaseHas('personal_access_tokens', [
            'id' => $subjectOlderTokenOneId,
            'tokenable_id' => $subjectUser->id,
            'tokenable_type' => $subjectUser->getMorphClass(),
        ]);

        $this->assertDatabaseHas('personal_access_tokens', [
            'id' => $subjectOlderTokenTwoId,
            'tokenable_id' => $subjectUser->id,
            'tokenable_type' => $subjectUser->getMorphClass(),
        ]);

        // Protected token.
        $protectedToken = $protectedUser->createToken('account-delete-sanctum-protected-token');
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

        // Manifest setup.
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
                'sanctum_tokens',
                'google_drive_credentials',
                'activity_logs',
                'user_record',
                'other_user_owned_resources',
            ] as $category
        ) {
            $this->assertSame('pending', $inProgressManifest->category_states[$category]);
        }

        // Capture manifest baseline.
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

        // Missing service contract is expected to be RED.
        $service = app(AccountDeleteSanctumTokensCleanupService::class);

        $result = $service->cleanupWithResult($inProgressManifest);

        $this->assertInstanceOf(AccountDeleteSanctumTokensCleanupResult::class, $result);
        $this->assertTrue($result->executed);
        $this->assertSame(3, $result->deletedCount);

        // Subject token deletion assertions.
        $this->assertNull(PersonalAccessToken::query()->find($subjectCurrentTokenId));
        $this->assertNull(PersonalAccessToken::query()->find($subjectOlderTokenOneId));
        $this->assertNull(PersonalAccessToken::query()->find($subjectOlderTokenTwoId));

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
        $this->assertDatabaseHas('users', ['id' => $subjectUser->id]);
        $this->assertDatabaseHas('users', ['id' => $protectedUser->id]);

        // Manifest immutability.
        $afterManifest = AccountDeleteCleanupManifest::query()->find($inProgressManifest->getKey());
        $this->assertNotNull($afterManifest);

        $this->assertSame($baseline['status'], $afterManifest->status);
        $this->assertSame($baseline['attempt_count'], (int) $afterManifest->attempt_count);
        $this->assertNull($afterManifest->completed_at);
        $this->assertNull($afterManifest->failure_category);
        $this->assertSame($baseline['category_states'], $afterManifest->category_states);

        $this->assertEquals($baseline['created_at'], $afterManifest->created_at);
        $this->assertEquals($baseline['updated_at'], $afterManifest->updated_at);

        // No category bookkeeping side effects.
        $this->assertSame('pending', $afterManifest->category_states['sanctum_tokens']);
    }
}

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

class AccountDeleteSanctumTokensCleanupPendingManifestTest extends TestCase
{
    use RefreshDatabase;

    public function test_sanctum_tokens_cleanup_rejects_pending_manifest_without_deleting_tokens(): void
    {
        $subjectUser = User::factory()->create([
            'email' => 'account-delete-sanctum-pending-subject@example.com',
            'password' => null,
        ]);

        $protectedUser = User::factory()->create([
            'email' => 'account-delete-sanctum-pending-protected@example.com',
            'password' => null,
        ]);

        $this->assertDatabaseHas('users', ['id' => $subjectUser->id]);
        $this->assertDatabaseHas('users', ['id' => $protectedUser->id]);

        $subjectCurrentToken = $subjectUser->createToken('account-delete-sanctum-pending-current-token');
        $subjectOlderTokenOne = $subjectUser->createToken('account-delete-sanctum-pending-older-token-one');
        $subjectOlderTokenTwo = $subjectUser->createToken('account-delete-sanctum-pending-older-token-two');

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

        $protectedToken = $protectedUser->createToken('account-delete-sanctum-pending-protected-token');
        $protectedTokenId = (int) $protectedToken->accessToken->getKey();

        $this->assertDatabaseHas('personal_access_tokens', [
            'id' => $protectedTokenId,
            'tokenable_id' => $protectedUser->id,
            'tokenable_type' => $protectedUser->getMorphClass(),
        ]);

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

        $pendingManifest = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($pendingManifest);

        $this->assertSame('pending', $pendingManifest->status);
        $this->assertSame(0, (int) $pendingManifest->attempt_count);
        $this->assertNull($pendingManifest->last_attempt_at);
        $this->assertNull($pendingManifest->completed_at);
        $this->assertNull($pendingManifest->failure_category);
        $this->assertSame('pending', $pendingManifest->category_states['sanctum_tokens']);

        foreach (
            $pendingManifest->category_states as $category => $state
        ) {
            $this->assertSame('pending', $state);
        }

        $baseline = [
            'operation_id' => $pendingManifest->operation_id,
            'subject_user_id' => $pendingManifest->subject_user_id,
            'ownership_snapshot' => $pendingManifest->ownership_snapshot,
            'category_states' => $pendingManifest->category_states,
            'status' => $pendingManifest->status,
            'attempt_count' => (int) $pendingManifest->attempt_count,
            'last_attempt_at' => $pendingManifest->last_attempt_at,
            'completed_at' => $pendingManifest->completed_at,
            'failure_category' => $pendingManifest->failure_category,
            'created_at' => $pendingManifest->created_at,
            'updated_at' => $pendingManifest->updated_at,
        ];

        $service = app(AccountDeleteSanctumTokensCleanupService::class);

        $result = $service->cleanupWithResult($pendingManifest);

        $this->assertInstanceOf(AccountDeleteSanctumTokensCleanupResult::class, $result);
        $this->assertFalse($result->executed);
        $this->assertSame(0, $result->deletedCount);

        // Token preservation: subject tokens unchanged.
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

        // Token preservation: protected token unchanged.
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

        $afterManifest = AccountDeleteCleanupManifest::query()->find($pendingManifest->getKey());
        $this->assertNotNull($afterManifest);

        $afterManifestReloaded = $afterManifest->fresh();

        $this->assertSame($baseline['status'], $afterManifestReloaded->status);
        $this->assertSame($baseline['attempt_count'], (int) $afterManifestReloaded->attempt_count);
        $this->assertSame($baseline['last_attempt_at'], $afterManifestReloaded->last_attempt_at);
        $this->assertNull($afterManifestReloaded->completed_at);
        $this->assertNull($afterManifestReloaded->failure_category);
        $this->assertSame($baseline['category_states'], $afterManifestReloaded->category_states);

        $this->assertEquals($baseline['created_at'], $afterManifestReloaded->created_at);
        $this->assertEquals($baseline['updated_at'], $afterManifestReloaded->updated_at);
    }
}

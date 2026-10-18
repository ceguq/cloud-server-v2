<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\AccountDeleteCleanupManifest;
use App\Models\User;
use App\Services\AccountDeleteCleanupManifestService;
use App\Services\AccountDeleteSanctumTokensCleanupOrchestrator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\PersonalAccessToken;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

final class AccountDeleteSanctumTokensCleanupOrchestratorLegacyExecuteTest extends TestCase
{
    use RefreshDatabase;

    public function test_legacy_execute_returns_true_after_successful_sanctum_tokens_cleanup(): void
    {
        // ── Arrangement ──────────────────────────────────────────────────────

        $subjectUser = User::factory()->create([
            'email' => 'account-delete-sanctum-legacy-execute-subject@example.com',
            'password' => null,
        ]);

        $secondUser = User::factory()->create([
            'email' => 'account-delete-sanctum-legacy-execute-second@example.com',
            'password' => null,
        ]);

        $this->assertDatabaseHas('users', ['id' => $subjectUser->id]);
        $this->assertDatabaseHas('users', ['id' => $secondUser->id]);

        // Create 3 removable Sanctum tokens owned by the subject User.
        $subjectTokenOne = $subjectUser->createToken('account-delete-sanctum-legacy-execute-token-one');
        $subjectTokenTwo = $subjectUser->createToken('account-delete-sanctum-legacy-execute-token-two');
        $subjectTokenThree = $subjectUser->createToken('account-delete-sanctum-legacy-execute-token-three');

        $subjectTokenOneId = (int) $subjectTokenOne->accessToken->getKey();
        $subjectTokenTwoId = (int) $subjectTokenTwo->accessToken->getKey();
        $subjectTokenThreeId = (int) $subjectTokenThree->accessToken->getKey();

        $userMorphType = $subjectUser->getMorphClass();

        foreach ([$subjectTokenOneId, $subjectTokenTwoId, $subjectTokenThreeId] as $tokenId) {
            $this->assertDatabaseHas('personal_access_tokens', [
                'id' => $tokenId,
                'tokenable_type' => $userMorphType,
                'tokenable_id' => $subjectUser->id,
            ]);
        }

        // Create 1 Sanctum token owned by the second User (must survive because cleanup is scoped).
        Sanctum::actingAs($secondUser);
        $secondUserToken = $secondUser->createToken('account-delete-sanctum-legacy-execute-second-user-token');
        $secondUserTokenId = (int) $secondUserToken->accessToken->getKey();

        $this->assertDatabaseHas('personal_access_tokens', [
            'id' => $secondUserTokenId,
            'tokenable_type' => $secondUser->getMorphClass(),
            'tokenable_id' => $secondUser->id,
        ]);

        $secondUserTokenRow = (object) ($secondUser->tokens()->where('id', $secondUserTokenId)->first());

        $secondUserTokenCaptured = [
            'id' => (int) $secondUserTokenRow->id,
            'tokenable_type' => (string) $secondUserTokenRow->tokenable_type,
            'tokenable_id' => (int) $secondUserTokenRow->tokenable_id,
            'name' => (string) $secondUserTokenRow->name,
            'abilities' => $secondUserTokenRow->abilities,
            'last_used_at' => $secondUserTokenRow->last_used_at,
            'expires_at' => $secondUserTokenRow->expires_at,
            'created_at' => $secondUserTokenRow->created_at,
            'updated_at' => $secondUserTokenRow->updated_at,
        ];

        // Create manifest and transition to in_progress.
        $manifestService = app(AccountDeleteCleanupManifestService::class);
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

        $expectedOtherCategories = [
            'database_records',
            'physical_local_files',
            'share_links',
            'devices',
            'oauth_identities',
            'google_drive_credentials',
            'activity_logs',
            'user_record',
            'other_user_owned_resources',
        ];

        foreach ($expectedOtherCategories as $category) {
            $this->assertSame('pending', $inProgressManifest->category_states[$category]);
        }

        // Snapshot all category states other than sanctum_tokens to verify they remain unchanged.
        $otherCategoryStatesSnapshot = [];
        foreach ($expectedOtherCategories as $category) {
            $otherCategoryStatesSnapshot[$category] = $inProgressManifest->category_states[$category];
        }

        // Capture overall manifest baseline fields.
        $baselineOperationId = $inProgressManifest->operation_id;
        $baselineSubjectUserId = $inProgressManifest->subject_user_id;
        $baselineOwnershipSnapshot = $inProgressManifest->ownership_snapshot;
        $baselineStatus = $inProgressManifest->status;
        $baselineAttemptCount = (int) $inProgressManifest->attempt_count;
        $baselineLastAttemptAt = $inProgressManifest->last_attempt_at;
        $baselineCompletedAt = $inProgressManifest->completed_at;
        $baselineFailureCategory = $inProgressManifest->failure_category;
        $baselineCreatedAt = $inProgressManifest->created_at;

        // ── Act ──────────────────────────────────────────────────────────────

        $orchestrator = app(AccountDeleteSanctumTokensCleanupOrchestrator::class);

        $result = $orchestrator->execute($inProgressManifest);

        // ── Assertions ───────────────────────────────────────────────────────

        // 1. Legacy execute() returns true.
        $this->assertTrue($result);

        // 2. All 3 removable subject tokens are deleted.
        $this->assertNull(PersonalAccessToken::query()->find($subjectTokenOneId));
        $this->assertNull(PersonalAccessToken::query()->find($subjectTokenTwoId));
        $this->assertNull(PersonalAccessToken::query()->find($subjectTokenThreeId));

        $this->assertSame(
            0,
            PersonalAccessToken::query()
                ->where('tokenable_type', $userMorphType)
                ->where('tokenable_id', (int) $subjectUser->id)
                ->count(),
        );

        // 3. The second User's token still exists (cleanup was owner-scoped).
        $secondUserTokenAfter = PersonalAccessToken::query()->find($secondUserTokenId);
        $this->assertNotNull($secondUserTokenAfter);

        $this->assertSame($secondUserTokenCaptured['id'], (int) $secondUserTokenAfter->id);
        $this->assertSame($secondUserTokenCaptured['tokenable_type'], (string) $secondUserTokenAfter->tokenable_type);
        $this->assertSame($secondUserTokenCaptured['tokenable_id'], (int) $secondUserTokenAfter->tokenable_id);
        $this->assertSame($secondUserTokenCaptured['name'], (string) $secondUserTokenAfter->name);
        $this->assertSame($secondUserTokenCaptured['abilities'], $secondUserTokenAfter->abilities);
        $this->assertEquals($secondUserTokenCaptured['last_used_at'], $secondUserTokenAfter->last_used_at);
        $this->assertEquals($secondUserTokenCaptured['expires_at'], $secondUserTokenAfter->expires_at);
        $this->assertEquals($secondUserTokenCaptured['created_at'], $secondUserTokenAfter->created_at);
        $this->assertEquals($secondUserTokenCaptured['updated_at'], $secondUserTokenAfter->updated_at);

        // 4. Both users still exist.
        $this->assertNotNull(User::query()->find($subjectUser->id));
        $this->assertNotNull(User::query()->find($secondUser->id));

        // 5. Refresh the manifest.
        $afterManifest = AccountDeleteCleanupManifest::query()->find($inProgressManifest->getKey());
        $this->assertNotNull($afterManifest);

        $afterManifestReloaded = $afterManifest->fresh();

        // 6. category_states['sanctum_tokens'] is now 'completed'.
        $this->assertSame('completed', $afterManifestReloaded->category_states['sanctum_tokens']);

        // 7. Every other category state is unchanged from the pre-execution snapshot.
        foreach ($expectedOtherCategories as $category) {
            $this->assertArrayHasKey($category, $afterManifestReloaded->category_states);
            $this->assertSame(
                $otherCategoryStatesSnapshot[$category],
                $afterManifestReloaded->category_states[$category],
                "Category state for '{$category}' changed unexpectedly.",
            );
        }

        // 8. Overall manifest remains in_progress (not globally completed).
        $this->assertSame('in_progress', $afterManifestReloaded->status);

        // 9. Overall completed_at remains null.
        $this->assertNull($afterManifestReloaded->completed_at);

        // 10. All other manifest fields untouched.
        $this->assertSame($baselineOperationId, $afterManifestReloaded->operation_id);
        $this->assertSame($baselineSubjectUserId, $afterManifestReloaded->subject_user_id);
        $this->assertSame($baselineOwnershipSnapshot, $afterManifestReloaded->ownership_snapshot);
        $this->assertSame($baselineStatus, $afterManifestReloaded->status);
        $this->assertSame($baselineAttemptCount, (int) $afterManifestReloaded->attempt_count);
        $this->assertEquals($baselineLastAttemptAt, $afterManifestReloaded->last_attempt_at);
        $this->assertNull($baselineCompletedAt);
        $this->assertNull($afterManifestReloaded->failure_category);
        $this->assertEquals($baselineCreatedAt, $afterManifestReloaded->created_at);
    }
}

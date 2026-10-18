<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\AccountDeleteCleanupManifest;
use App\Models\User;
use App\Services\AccountDeleteCleanupCategoryExecutionResult;
use App\Services\AccountDeleteCleanupCoordinator;
use App\Services\AccountDeleteCleanupManifestService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\PersonalAccessToken;
use Tests\TestCase;

final class AccountDeleteCleanupCoordinatorRejectedSecondCategoryTest extends TestCase
{
    use RefreshDatabase;

    public function test_coordinator_stops_after_oauth_identities_bookkeeping_failure_without_executing_sanctum_tokens(): void
    {
        // ── Arrangement ──────────────────────────────────────────────────────

        $authorizedCategories = [
            'database_records',
            'physical_local_files',
            'share_links',
            'devices',
            'oauth_identities',
            'sanctum_tokens',
            'google_drive_credentials',
            'activity_logs',
            'other_user_owned_resources',
            'user_record',
        ];

        $categoriesAfterOauth = [
            'sanctum_tokens',
            'google_drive_credentials',
            'activity_logs',
            'other_user_owned_resources',
            'user_record',
        ];

        $subjectUser = User::factory()->create([
            'email' => 'account-delete-coordinator-rejected-second-subject@example.com',
            'password' => null,
        ]);

        $secondUser = User::factory()->create([
            'email' => 'account-delete-coordinator-rejected-second-other@example.com',
            'password' => null,
        ]);

        $this->assertDatabaseHas('users', ['id' => $subjectUser->id]);
        $this->assertDatabaseHas('users', ['id' => $secondUser->id]);

        // 3 Sanctum tokens for the subject User.
        $subjectTokenOne = $subjectUser->createToken('account-delete-coordinator-rejected-second-subject-token-1');
        $subjectTokenTwo = $subjectUser->createToken('account-delete-coordinator-rejected-second-subject-token-2');
        $subjectTokenThree = $subjectUser->createToken('account-delete-coordinator-rejected-second-subject-token-3');

        $subjectTokenOneId = (int) $subjectTokenOne->accessToken->getKey();
        $subjectTokenTwoId = (int) $subjectTokenTwo->accessToken->getKey();
        $subjectTokenThreeId = (int) $subjectTokenThree->accessToken->getKey();

        $subjectTokenIds = [$subjectTokenOneId, $subjectTokenTwoId, $subjectTokenThreeId];

        $subjectMorphType = $subjectUser->getMorphClass();

        foreach ($subjectTokenIds as $tokenId) {
            $this->assertDatabaseHas('personal_access_tokens', [
                'id' => $tokenId,
                'tokenable_type' => $subjectMorphType,
                'tokenable_id' => $subjectUser->id,
            ]);
        }

        $this->assertSame(3, PersonalAccessToken::query()
            ->where('tokenable_type', $subjectMorphType)
            ->where('tokenable_id', (int) $subjectUser->id)
            ->count());

        // 1 Sanctum token for the second User.
        $secondUserToken = $secondUser->createToken('account-delete-coordinator-rejected-second-other-token');
        $secondUserTokenId = (int) $secondUserToken->accessToken->getKey();

        $this->assertDatabaseHas('personal_access_tokens', [
            'id' => $secondUserTokenId,
            'tokenable_type' => $secondUser->getMorphClass(),
            'tokenable_id' => $secondUser->id,
        ]);

        $this->assertSame(1, PersonalAccessToken::query()
            ->where('tokenable_type', $secondUser->getMorphClass())
            ->where('tokenable_id', (int) $secondUser->id)
            ->count());

        // Create manifest via the real service and begin attempt.
        $manifestService = new class extends AccountDeleteCleanupManifestService
        {
            public function markCategoryCompleted(
                AccountDeleteCleanupManifest $manifest,
                string $category,
            ): bool {
                if ($category === 'oauth_identities') {
                    return false;
                }

                return parent::markCategoryCompleted($manifest, $category);
            }
        };
        app()->instance(AccountDeleteCleanupManifestService::class, $manifestService);
        $manifest = $manifestService->createForUser($subjectUser);

        $this->assertTrue(
            $manifestService->beginAttempt($manifest),
        );

        // Reload authoritative in-progress manifest.
        $inProgressManifest = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($inProgressManifest);

        $this->assertSame('in_progress', $inProgressManifest->status);
        $this->assertSame(1, (int) $inProgressManifest->attempt_count);
        $this->assertNull($inProgressManifest->completed_at);
        $this->assertNull($inProgressManifest->failure_category);

        $this->assertSame($authorizedCategories, array_keys($inProgressManifest->category_states));
        $this->assertSame('pending', $inProgressManifest->category_states['share_links']);
        $this->assertSame('pending', $inProgressManifest->category_states['oauth_identities']);
        $this->assertSame('pending', $inProgressManifest->category_states['sanctum_tokens']);

        // Capture pre-coordinator snapshot of all categories after oauth_identities.
        $categoryStatesSnapshot = [];
        foreach ($categoriesAfterOauth as $cat) {
            $categoryStatesSnapshot[$cat] = $inProgressManifest->category_states[$cat];
        }

        // Capture baseline manifest fields.
        $baselineOperationId = $inProgressManifest->operation_id;
        $baselineSubjectUserId = $inProgressManifest->subject_user_id;
        $baselineOwnershipSnapshot = $inProgressManifest->ownership_snapshot;
        $baselineStatus = $inProgressManifest->status;
        $baselineAttemptCount = (int) $inProgressManifest->attempt_count;
        $baselineLastAttemptAt = $inProgressManifest->last_attempt_at;
        $baselineCompletedAt = $inProgressManifest->completed_at;
        $baselineFailureCategory = $inProgressManifest->failure_category;
        $baselineCreatedAt = $inProgressManifest->created_at;

        $this->assertSame('pending', $inProgressManifest->category_states['share_links']);
        $this->assertSame('pending', $inProgressManifest->category_states['oauth_identities']);

        // ── Act ──────────────────────────────────────────────────────────────

        $coordinator = app(AccountDeleteCleanupCoordinator::class);

        $results = $coordinator->execute($inProgressManifest);

        // ── Result Assertions ────────────────────────────────────────────────

        $this->assertIsArray($results);
        $this->assertCount(2, $results);
        $this->assertSame([0, 1], array_keys($results));

        // Result [0]: share_links completed.
        $this->assertInstanceOf(AccountDeleteCleanupCategoryExecutionResult::class, $results[0]);
        $this->assertSame('share_links', $results[0]->category);
        $this->assertSame(AccountDeleteCleanupCategoryExecutionResult::OUTCOME_COMPLETED, $results[0]->outcome);
        $this->assertTrue($results[0]->cleanupExecuted);
        $this->assertTrue($results[0]->categoryCompleted);

        // Result [1]: oauth_identities cleanup ran, but category bookkeeping failed.
        $this->assertInstanceOf(AccountDeleteCleanupCategoryExecutionResult::class, $results[1]);
        $this->assertSame('oauth_identities', $results[1]->category);
        $this->assertSame(AccountDeleteCleanupCategoryExecutionResult::OUTCOME_BOOKKEEPING_FAILED, $results[1]->outcome);
        $this->assertTrue($results[1]->cleanupExecuted);
        $this->assertFalse($results[1]->categoryCompleted);

        // No result index [2].
        $this->assertArrayNotHasKey(2, $results);

        // ── Proof That Sanctum Tokens Were Not Executed ──────────────────────

        // All 3 subject tokens still exist.
        foreach ($subjectTokenIds as $tokenId) {
            $this->assertNotNull(PersonalAccessToken::query()->find($tokenId));
        }

        // Subject token count unchanged.
        $this->assertSame(3, PersonalAccessToken::query()
            ->where('tokenable_type', $subjectMorphType)
            ->where('tokenable_id', (int) $subjectUser->id)
            ->count());

        // Second User token still exists.
        $this->assertNotNull(PersonalAccessToken::query()->find($secondUserTokenId));

        // Second User token count unchanged.
        $this->assertSame(1, PersonalAccessToken::query()
            ->where('tokenable_type', $secondUser->getMorphClass())
            ->where('tokenable_id', (int) $secondUser->id)
            ->count());

        // Both users still exist.
        $this->assertNotNull(User::query()->find($subjectUser->id));
        $this->assertNotNull(User::query()->find($secondUser->id));

        // ── Manifest Assertions ──────────────────────────────────────────────

        $afterManifest = AccountDeleteCleanupManifest::query()->find($inProgressManifest->getKey());
        $this->assertNotNull($afterManifest);

        $afterManifestReloaded = $afterManifest->fresh();

        // share_links was completed.
        $this->assertSame('completed', $afterManifestReloaded->category_states['share_links']);

        $this->assertSame('pending', $afterManifestReloaded->category_states['oauth_identities']);

        // sanctum_tokens is unchanged from pre-execution snapshot.
        $this->assertSame(
            $categoryStatesSnapshot['sanctum_tokens'],
            $afterManifestReloaded->category_states['sanctum_tokens'],
        );

        // All categories after oauth_identities are unchanged.
        foreach ($categoriesAfterOauth as $cat) {
            $this->assertArrayHasKey($cat, $afterManifestReloaded->category_states);
            $this->assertSame(
                $categoryStatesSnapshot[$cat],
                $afterManifestReloaded->category_states[$cat],
                "Category '{$cat}' changed unexpectedly.",
            );
        }

        // Overall status remains in_progress.
        $this->assertSame('in_progress', $afterManifestReloaded->status);

        // completed_at remains null.
        $this->assertNull($afterManifestReloaded->completed_at);

        // No global completion recorded.
        $this->assertNull($afterManifestReloaded->failure_category);

        // Unrelated manifest fields unchanged.
        $this->assertSame($baselineOperationId, $afterManifestReloaded->operation_id);
        $this->assertSame($baselineSubjectUserId, $afterManifestReloaded->subject_user_id);
        $this->assertSame($baselineOwnershipSnapshot, $afterManifestReloaded->ownership_snapshot);
        $this->assertSame($baselineStatus, $afterManifestReloaded->status);
        $this->assertSame($baselineAttemptCount, (int) $afterManifestReloaded->attempt_count);
        $this->assertEquals($baselineLastAttemptAt, $afterManifestReloaded->last_attempt_at);
        $this->assertNull($baselineCompletedAt);
        $this->assertNull($baselineFailureCategory);
        $this->assertEquals($baselineCreatedAt, $afterManifestReloaded->created_at);
    }
}

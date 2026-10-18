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

final class AccountDeleteCleanupCoordinatorSanctumTokensTest extends TestCase
{
    use RefreshDatabase;

    public function test_coordinator_executes_sanctum_tokens_after_prior_categories_complete(): void
    {
        // ── Fixtures ─────────────────────────────────────────────────────────

        $subjectUser = User::factory()->create([
            'email' => 'account-delete-coordinator-sanctum-subject@example.com',
            'password' => null,
        ]);

        $secondUser = User::factory()->create([
            'email' => 'account-delete-coordinator-sanctum-second@example.com',
            'password' => null,
        ]);

        $this->assertDatabaseHas('users', ['id' => $subjectUser->id]);
        $this->assertDatabaseHas('users', ['id' => $secondUser->id]);

        // Create exactly 3 Sanctum tokens owned by the subject User.
        $subjectTokenOne = $subjectUser->createToken('account-delete-coordinator-sanctum-subject-one');
        $subjectTokenTwo = $subjectUser->createToken('account-delete-coordinator-sanctum-subject-two');
        $subjectTokenThree = $subjectUser->createToken('account-delete-coordinator-sanctum-subject-three');

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

        // Create exactly 1 Sanctum token owned by the second User.
        $secondUserToken = $secondUser->createToken('account-delete-coordinator-sanctum-second-user-token');
        $secondUserTokenId = (int) $secondUserToken->accessToken->getKey();

        $this->assertDatabaseHas('personal_access_tokens', [
            'id' => $secondUserTokenId,
            'tokenable_type' => $secondUser->getMorphClass(),
            'tokenable_id' => $secondUser->id,
        ]);

        // Capture the second User token for comparison after execution.
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

        // The subject User has no share links, no files, and no OAuth identities.
        // Zero records for share_links and oauth_identities result in successful
        // completion (executed with 0 deleted count).

        // Create manifest and transition to in_progress.
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

        // Assert the relevant categories are in valid pre-execution state.
        $this->assertSame('pending', $inProgressManifest->category_states['share_links']);
        $this->assertSame('pending', $inProgressManifest->category_states['oauth_identities']);
        $this->assertSame('pending', $inProgressManifest->category_states['physical_local_files']);
        $this->assertSame('pending', $inProgressManifest->category_states['database_records']);
        $this->assertSame('pending', $inProgressManifest->category_states['sanctum_tokens']);
        $this->assertSame('pending', $inProgressManifest->category_states['google_drive_credentials']);

        // Capture baseline manifest fields for post-execution comparison.
        $baselineOperationId = $inProgressManifest->operation_id;
        $baselineSubjectUserId = $inProgressManifest->subject_user_id;
        $baselineStatus = $inProgressManifest->status;
        $baselineAttemptCount = (int) $inProgressManifest->attempt_count;
        $baselineCompletedAt = $inProgressManifest->completed_at;
        $baselineFailureCategory = $inProgressManifest->failure_category;
        $baselineCreatedAt = $inProgressManifest->created_at;

        // ── Act ──────────────────────────────────────────────────────────────

        $coordinator = app(AccountDeleteCleanupCoordinator::class);

        $results = $coordinator->execute($inProgressManifest);

        // ── Assertions ───────────────────────────────────────────────────────

        // 1. The returned array contains all ten coordinator results.
        $this->assertCount(10, $results);

        // 2. Result categories in order.
        $this->assertSame('share_links', $results[0]->category);
        $this->assertSame('oauth_identities', $results[1]->category);
        $this->assertSame('physical_local_files', $results[2]->category);
        $this->assertSame('database_records', $results[3]->category);
        $this->assertSame('devices', $results[4]->category);
        $this->assertSame('sanctum_tokens', $results[5]->category);
        $this->assertSame('google_drive_credentials', $results[6]->category);
        $this->assertSame('activity_logs', $results[7]->category);
        $this->assertSame('other_user_owned_resources', $results[8]->category);
        $this->assertSame('user_record', $results[9]->category);

        // 3. Each result reports cleanup executed and category completed.
        foreach ($results as $index => $result) {
            $this->assertInstanceOf(
                AccountDeleteCleanupCategoryExecutionResult::class,
                $result,
                "Result at index {$index} is not an AccountDeleteCleanupCategoryExecutionResult.",
            );
            $this->assertTrue(
                $result->cleanupExecuted,
                "Result at index {$index} did not execute cleanup.",
            );
            $this->assertTrue(
                $result->categoryCompleted,
                "Result at index {$index} did not complete the category.",
            );
            $this->assertSame(
                AccountDeleteCleanupCategoryExecutionResult::OUTCOME_COMPLETED,
                $result->outcome,
                "Result at index {$index} outcome is not completed.",
            );
        }

        // 4. All 3 subject Sanctum tokens are deleted.
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

        // 5. The second User's token still exists unchanged.
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

        // 6. Only the unrelated User record remains.
        $this->assertNull(User::query()->find($subjectUser->id));
        $this->assertNotNull(User::query()->find($secondUser->id));

        // 7. Refresh the manifest.
        $afterManifest = AccountDeleteCleanupManifest::query()->find($inProgressManifest->getKey());
        $this->assertNotNull($afterManifest);

        $afterManifestReloaded = $afterManifest->fresh();

        // 8. Category states are completed for all implemented categories.
        $this->assertSame('completed', $afterManifestReloaded->category_states['share_links']);
        $this->assertSame('completed', $afterManifestReloaded->category_states['oauth_identities']);
        $this->assertSame('completed', $afterManifestReloaded->category_states['physical_local_files']);
        $this->assertSame('completed', $afterManifestReloaded->category_states['database_records']);
        $this->assertSame('completed', $afterManifestReloaded->category_states['devices']);
        $this->assertSame('completed', $afterManifestReloaded->category_states['sanctum_tokens']);
        $this->assertSame('completed', $afterManifestReloaded->category_states['google_drive_credentials']);
        $this->assertSame('completed', $afterManifestReloaded->category_states['activity_logs']);
        $this->assertSame('completed', $afterManifestReloaded->category_states['other_user_owned_resources']);
        $this->assertSame('completed', $afterManifestReloaded->category_states['user_record']);

        // 9. The terminal category completes the overall manifest.
        $this->assertSame('completed', $afterManifestReloaded->status);

        // 10. Overall completion is timestamped.
        $this->assertNotNull($afterManifestReloaded->completed_at);

        // 11. Other manifest fields unchanged.
        $this->assertSame($baselineOperationId, $afterManifestReloaded->operation_id);
        $this->assertSame($baselineSubjectUserId, $afterManifestReloaded->subject_user_id);
        $this->assertSame('in_progress', $baselineStatus);
        $this->assertSame('completed', $afterManifestReloaded->status);
        $this->assertSame($baselineAttemptCount, (int) $afterManifestReloaded->attempt_count);
        $this->assertNull($baselineFailureCategory);
        $this->assertNull($afterManifestReloaded->failure_category);
        $this->assertEquals($baselineCreatedAt, $afterManifestReloaded->created_at);
    }
}

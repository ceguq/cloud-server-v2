<?php

namespace Tests\Feature;

use App\Models\AccountDeleteCleanupManifest;
use App\Models\OAuthIdentity;
use App\Models\User;
use App\Services\AccountDeleteCleanupCategoryExecutionResult;
use App\Services\AccountDeleteCleanupManifestService;
use App\Services\AccountDeleteOAuthIdentitiesCleanupOrchestrator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AccountDeleteOAuthIdentitiesCleanupOrchestratorExecutionResultTest extends TestCase
{
    use RefreshDatabase;

    public function test_execute_with_result_returns_completed_result_after_oauth_identities_cleanup_and_bookkeeping()
    {
        $subjectUser = User::factory()->create([
            'email' => 'account-delete-oauth-execution-result-subject@example.com',
            'password' => null,
        ]);

        $protectedUser = User::factory()->create([
            'email' => 'account-delete-oauth-execution-result-protected@example.com',
            'password' => null,
        ]);

        $this->assertDatabaseHas('users', ['id' => $subjectUser->id]);
        $this->assertDatabaseHas('users', ['id' => $protectedUser->id]);

        // Required OAuth Identity fixtures (exactly 2 for subject, exactly 1 for protected).
        $subjectGoogle = $subjectUser->oauthIdentities()->create([
            'provider' => 'google',
            'provider_user_id' => 'account-delete-oauth-execution-result-subject-google',
        ]);

        $subjectGithub = $subjectUser->oauthIdentities()->create([
            'provider' => 'github',
            'provider_user_id' => 'account-delete-oauth-execution-result-subject-github',
        ]);

        $protectedGithub = $protectedUser->oauthIdentities()->create([
            'provider' => 'github',
            'provider_user_id' => 'account-delete-oauth-execution-result-protected-github',
        ]);

        $this->assertDatabaseHas('oauth_identities', ['id' => $subjectGoogle->id]);
        $this->assertDatabaseHas('oauth_identities', ['id' => $subjectGithub->id]);
        $this->assertDatabaseHas('oauth_identities', ['id' => $protectedGithub->id]);

        // Capture protected identity supported fields.
        $protectedIdentityCaptured = [
            'id' => (int) $protectedGithub->id,
            'user_id' => (int) $protectedGithub->user_id,
            'provider' => (string) $protectedGithub->provider,
            'provider_user_id' => (string) $protectedGithub->provider_user_id,
            'provider_email' => $protectedGithub->provider_email,
            'avatar_url' => $protectedGithub->avatar_url,
            'created_at' => $protectedGithub->created_at,
            'updated_at' => $protectedGithub->updated_at,
        ];

        // Sanctum-token protection (do not delete tokens).
        Sanctum::actingAs($subjectUser);
        $subjectToken = $subjectUser->createToken('account-delete-oauth-execution-result-subject');

        Sanctum::actingAs($protectedUser);
        $protectedToken = $protectedUser->createToken('account-delete-oauth-execution-result-protected');

        $subjectPersonalAccessTokenId = (int) $subjectToken->accessToken->getKey();
        $protectedPersonalAccessTokenId = (int) $protectedToken->accessToken->getKey();

        $this->assertDatabaseHas('personal_access_tokens', ['id' => $subjectPersonalAccessTokenId]);
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $protectedPersonalAccessTokenId]);

        // Manifest setup.
        $manifestService = app(AccountDeleteCleanupManifestService::class);
        $manifest = $manifestService->createForUser($subjectUser);

        $started = $manifestService->beginAttempt($manifest);
        $this->assertTrue($started);

        $inProgressManifest = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($inProgressManifest);

        $inProgressManifestReloaded = $inProgressManifest->fresh();

        $this->assertSame('in_progress', $inProgressManifestReloaded->status);
        $this->assertSame(1, (int) $inProgressManifestReloaded->attempt_count);
        $this->assertNull($inProgressManifestReloaded->completed_at);
        $this->assertNull($inProgressManifestReloaded->failure_category);
        $this->assertSame('pending', $inProgressManifestReloaded->category_states['oauth_identities']);

        foreach (
            [
                'database_records',
                'physical_local_files',
                'share_links',
                'devices',
                'sanctum_tokens',
                'google_drive_credentials',
                'activity_logs',
                'user_record',
                'other_user_owned_resources',
            ] as $category
        ) {
            $this->assertSame('pending', $inProgressManifestReloaded->category_states[$category]);
        }

        // Capture manifest baseline.
        $manifestBaseline = [
            'operation_id' => $inProgressManifestReloaded->operation_id,
            'subject_user_id' => $inProgressManifestReloaded->subject_user_id,
            'ownership_snapshot' => $inProgressManifestReloaded->ownership_snapshot,
            'status' => $inProgressManifestReloaded->status,
            'attempt_count' => (int) $inProgressManifestReloaded->attempt_count,
            'last_attempt_at' => $inProgressManifestReloaded->last_attempt_at,
            'completed_at' => $inProgressManifestReloaded->completed_at,
            'failure_category' => $inProgressManifestReloaded->failure_category,
            'created_at' => $inProgressManifestReloaded->created_at,
        ];

        // Missing method call: expected RED.
        $orchestrator = app(AccountDeleteOAuthIdentitiesCleanupOrchestrator::class);

        $result = $orchestrator->executeWithResult(
            $inProgressManifestReloaded,
        );

        // Required result assertions.
        $this->assertInstanceOf(AccountDeleteCleanupCategoryExecutionResult::class, $result);
        $this->assertSame('oauth_identities', $result->category);
        $this->assertSame(AccountDeleteCleanupCategoryExecutionResult::OUTCOME_COMPLETED, $result->outcome);
        $this->assertTrue($result->cleanupExecuted);
        $this->assertTrue($result->categoryCompleted);

        // Required resource assertions.
        $this->assertNull(OAuthIdentity::query()->find($subjectGoogle->id));
        $this->assertNull(OAuthIdentity::query()->find($subjectGithub->id));

        $protectedAfter = OAuthIdentity::query()->find($protectedIdentityCaptured['id']);
        $this->assertNotNull($protectedAfter);

        $this->assertSame($protectedIdentityCaptured['user_id'], (int) $protectedAfter->user_id);
        $this->assertSame($protectedIdentityCaptured['provider'], $protectedAfter->provider);
        $this->assertSame($protectedIdentityCaptured['provider_user_id'], $protectedAfter->provider_user_id);
        $this->assertSame($protectedIdentityCaptured['provider_email'], $protectedAfter->provider_email);
        $this->assertSame($protectedIdentityCaptured['avatar_url'], $protectedAfter->avatar_url);
        $this->assertEquals($protectedIdentityCaptured['created_at'], $protectedAfter->created_at);
        $this->assertEquals($protectedIdentityCaptured['updated_at'], $protectedAfter->updated_at);

        $this->assertDatabaseHas('users', ['id' => $subjectUser->id]);
        $this->assertDatabaseHas('users', ['id' => $protectedUser->id]);

        $this->assertDatabaseHas('personal_access_tokens', ['id' => $subjectPersonalAccessTokenId]);
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $protectedPersonalAccessTokenId]);

        // Required manifest bookkeeping assertions.
        $afterManifest = AccountDeleteCleanupManifest::query()->find($inProgressManifestReloaded->getKey());
        $this->assertNotNull($afterManifest);

        $afterManifestReloaded = $afterManifest->fresh();

        $this->assertSame('in_progress', $afterManifestReloaded->status);
        $this->assertSame(1, (int) $afterManifestReloaded->attempt_count);
        $this->assertNull($afterManifestReloaded->completed_at);
        $this->assertNull($afterManifestReloaded->failure_category);
        $this->assertSame('completed', $afterManifestReloaded->category_states['oauth_identities']);

        foreach (
            [
                'database_records',
                'physical_local_files',
                'share_links',
                'devices',
                'sanctum_tokens',
                'google_drive_credentials',
                'activity_logs',
                'user_record',
                'other_user_owned_resources',
            ] as $category
        ) {
            $this->assertSame('pending', $afterManifestReloaded->category_states[$category]);
        }

        // Required immutable-field assertions.
        $this->assertSame($manifestBaseline['operation_id'], $afterManifestReloaded->operation_id);
        $this->assertSame($manifestBaseline['subject_user_id'], $afterManifestReloaded->subject_user_id);
        $this->assertSame($manifestBaseline['ownership_snapshot'], $afterManifestReloaded->ownership_snapshot);
        $this->assertSame($manifestBaseline['status'], $afterManifestReloaded->status);
        $this->assertSame($manifestBaseline['attempt_count'], (int) $afterManifestReloaded->attempt_count);
        $this->assertEquals($manifestBaseline['last_attempt_at'], $afterManifestReloaded->last_attempt_at);
        $this->assertNull($afterManifestReloaded->completed_at);
        $this->assertSame($manifestBaseline['failure_category'], $afterManifestReloaded->failure_category);
        $this->assertEquals($manifestBaseline['created_at'], $afterManifestReloaded->created_at);
    }
}

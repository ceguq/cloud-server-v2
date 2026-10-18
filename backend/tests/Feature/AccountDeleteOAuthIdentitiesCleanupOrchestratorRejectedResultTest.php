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

class AccountDeleteOAuthIdentitiesCleanupOrchestratorRejectedResultTest extends TestCase
{
    use RefreshDatabase;

    public function test_execute_with_result_returns_rejected_for_pending_manifest_without_cleanup_or_bookkeeping(): void
    {
        $subjectUser = User::factory()->create([
            'email' => 'account-delete-oauth-rejected-result-subject@example.com',
            'password' => null,
        ]);

        $protectedUser = User::factory()->create([
            'email' => 'account-delete-oauth-rejected-result-protected@example.com',
            'password' => null,
        ]);

        $this->assertDatabaseHas('users', ['id' => $subjectUser->id]);
        $this->assertDatabaseHas('users', ['id' => $protectedUser->id]);

        // OAuth Identity fixtures: 2 subject, 1 protected.
        $subjectGoogle = $subjectUser->oauthIdentities()->create([
            'provider' => 'google',
            'provider_user_id' => 'account-delete-oauth-rejected-result-subject-google',
        ]);

        $subjectGithub = $subjectUser->oauthIdentities()->create([
            'provider' => 'github',
            'provider_user_id' => 'account-delete-oauth-rejected-result-subject-github',
        ]);

        $protectedGithub = $protectedUser->oauthIdentities()->create([
            'provider' => 'github',
            'provider_user_id' => 'account-delete-oauth-rejected-result-protected-github',
        ]);

        $this->assertDatabaseHas('oauth_identities', ['id' => $subjectGoogle->id]);
        $this->assertDatabaseHas('oauth_identities', ['id' => $subjectGithub->id]);
        $this->assertDatabaseHas('oauth_identities', ['id' => $protectedGithub->id]);

        $subjectGoogleId = (int) $subjectGoogle->id;
        $subjectGithubId = (int) $subjectGithub->id;
        $protectedIdentityId = (int) $protectedGithub->id;

        // Capture subject identity supported fields to prove preservation.
        $subjectGoogleCaptured = [
            'id' => (int) $subjectGoogle->id,
            'user_id' => (int) $subjectGoogle->user_id,
            'provider' => (string) $subjectGoogle->provider,
            'provider_user_id' => (string) $subjectGoogle->provider_user_id,
            'provider_email' => $subjectGoogle->provider_email,
            'avatar_url' => $subjectGoogle->avatar_url,
            'created_at' => $subjectGoogle->created_at,
            'updated_at' => $subjectGoogle->updated_at,
        ];

        $subjectGithubCaptured = [
            'id' => (int) $subjectGithub->id,
            'user_id' => (int) $subjectGithub->user_id,
            'provider' => (string) $subjectGithub->provider,
            'provider_user_id' => (string) $subjectGithub->provider_user_id,
            'provider_email' => $subjectGithub->provider_email,
            'avatar_url' => $subjectGithub->avatar_url,
            'created_at' => $subjectGithub->created_at,
            'updated_at' => $subjectGithub->updated_at,
        ];

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

        // Sanctum-token protection.
        Sanctum::actingAs($subjectUser);
        $subjectToken = $subjectUser->createToken('account-delete-oauth-rejected-result-subject');

        Sanctum::actingAs($protectedUser);
        $protectedToken = $protectedUser->createToken('account-delete-oauth-rejected-result-protected');

        $subjectPersonalAccessTokenId = (int) $subjectToken->accessToken->getKey();
        $protectedPersonalAccessTokenId = (int) $protectedToken->accessToken->getKey();

        $this->assertDatabaseHas('personal_access_tokens', ['id' => $subjectPersonalAccessTokenId]);
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $protectedPersonalAccessTokenId]);

        // Pending manifest setup (no beginAttempt()).
        $manifestService = app(AccountDeleteCleanupManifestService::class);
        $manifest = $manifestService->createForUser($subjectUser);

        $pendingManifest = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($pendingManifest);

        $pendingManifestReloaded = $pendingManifest->fresh();

        $this->assertSame('pending', $pendingManifestReloaded->status);
        $this->assertSame(0, (int) $pendingManifestReloaded->attempt_count);
        $this->assertNull($pendingManifestReloaded->last_attempt_at);
        $this->assertNull($pendingManifestReloaded->completed_at);
        $this->assertNull($pendingManifestReloaded->failure_category);
        $this->assertSame('pending', $pendingManifestReloaded->category_states['oauth_identities']);

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
            $this->assertSame('pending', $pendingManifestReloaded->category_states[$category]);
        }

        // Capture baseline manifest values.
        $manifestBaseline = [
            'operation_id' => $pendingManifestReloaded->operation_id,
            'subject_user_id' => $pendingManifestReloaded->subject_user_id,
            'ownership_snapshot' => $pendingManifestReloaded->ownership_snapshot,
            'category_states' => $pendingManifestReloaded->category_states,
            'status' => $pendingManifestReloaded->status,
            'attempt_count' => (int) $pendingManifestReloaded->attempt_count,
            'last_attempt_at' => $pendingManifestReloaded->last_attempt_at,
            'completed_at' => $pendingManifestReloaded->completed_at,
            'failure_category' => $pendingManifestReloaded->failure_category,
            'created_at' => $pendingManifestReloaded->created_at,
            'updated_at' => $pendingManifestReloaded->updated_at,
        ];

        $orchestrator = app(AccountDeleteOAuthIdentitiesCleanupOrchestrator::class);

        $result = $orchestrator->executeWithResult(
            $pendingManifestReloaded,
        );

        $this->assertInstanceOf(AccountDeleteCleanupCategoryExecutionResult::class, $result);
        $this->assertSame('oauth_identities', $result->category);
        $this->assertSame(AccountDeleteCleanupCategoryExecutionResult::OUTCOME_REJECTED, $result->outcome);
        $this->assertFalse($result->cleanupExecuted);
        $this->assertFalse($result->categoryCompleted);

        // Resource preservation assertions.
        $this->assertNotNull(OAuthIdentity::query()->find($subjectGoogleId));
        $this->assertNotNull(OAuthIdentity::query()->find($subjectGithubId));
        $this->assertNotNull(OAuthIdentity::query()->find($protectedIdentityId));

        $subjectGoogleAfter = OAuthIdentity::query()->find($subjectGoogleId);
        $this->assertNotNull($subjectGoogleAfter);
        $this->assertSame($subjectGoogleCaptured['user_id'], (int) $subjectGoogleAfter->user_id);
        $this->assertSame($subjectGoogleCaptured['provider'], $subjectGoogleAfter->provider);
        $this->assertSame($subjectGoogleCaptured['provider_user_id'], $subjectGoogleAfter->provider_user_id);
        $this->assertSame($subjectGoogleCaptured['provider_email'], $subjectGoogleAfter->provider_email);
        $this->assertSame($subjectGoogleCaptured['avatar_url'], $subjectGoogleAfter->avatar_url);
        $this->assertEquals($subjectGoogleCaptured['created_at'], $subjectGoogleAfter->created_at);
        $this->assertEquals($subjectGoogleCaptured['updated_at'], $subjectGoogleAfter->updated_at);

        $subjectGithubAfter = OAuthIdentity::query()->find($subjectGithubId);
        $this->assertNotNull($subjectGithubAfter);
        $this->assertSame($subjectGithubCaptured['user_id'], (int) $subjectGithubAfter->user_id);
        $this->assertSame($subjectGithubCaptured['provider'], $subjectGithubAfter->provider);
        $this->assertSame($subjectGithubCaptured['provider_user_id'], $subjectGithubAfter->provider_user_id);
        $this->assertSame($subjectGithubCaptured['provider_email'], $subjectGithubAfter->provider_email);
        $this->assertSame($subjectGithubCaptured['avatar_url'], $subjectGithubAfter->avatar_url);
        $this->assertEquals($subjectGithubCaptured['created_at'], $subjectGithubAfter->created_at);
        $this->assertEquals($subjectGithubCaptured['updated_at'], $subjectGithubAfter->updated_at);

        $protectedAfter = OAuthIdentity::query()->find($protectedIdentityId);
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

        // Manifest immutability assertions.
        $afterManifest = AccountDeleteCleanupManifest::query()->find($pendingManifestReloaded->getKey());
        $this->assertNotNull($afterManifest);

        $afterManifestReloaded = $afterManifest->fresh();

        $this->assertSame($manifestBaseline['operation_id'], $afterManifestReloaded->operation_id);
        $this->assertSame($manifestBaseline['subject_user_id'], $afterManifestReloaded->subject_user_id);
        $this->assertSame($manifestBaseline['ownership_snapshot'], $afterManifestReloaded->ownership_snapshot);
        $this->assertSame($manifestBaseline['category_states'], $afterManifestReloaded->category_states);
        $this->assertSame($manifestBaseline['status'], $afterManifestReloaded->status);
        $this->assertSame($manifestBaseline['attempt_count'], (int) $afterManifestReloaded->attempt_count);
        $this->assertNull($afterManifestReloaded->last_attempt_at);
        $this->assertNull($afterManifestReloaded->completed_at);
        $this->assertNull($afterManifestReloaded->failure_category);
        $this->assertEquals($manifestBaseline['created_at'], $afterManifestReloaded->created_at);
        $this->assertEquals($manifestBaseline['updated_at'], $afterManifestReloaded->updated_at);

        $this->assertSame('pending', $afterManifestReloaded->category_states['oauth_identities']);

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

        // Ensure no beginAttempt() was invoked.
        $this->assertSame(0, (int) $afterManifestReloaded->attempt_count);
    }
}

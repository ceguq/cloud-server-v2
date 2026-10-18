<?php

namespace Tests\Feature;

use App\Models\AccountDeleteCleanupManifest;
use App\Models\OAuthIdentity;
use App\Models\User;
use App\Services\AccountDeleteCleanupManifestService;
use App\Services\AccountDeleteOAuthIdentitiesCleanupOrchestrator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AccountDeleteOAuthIdentitiesCleanupOrchestratorTest extends TestCase
{
    use RefreshDatabase;

    public function test_orchestrator_cleans_subject_oauth_identities_and_marks_category_completed(): void
    {
        $subjectUser = User::factory()->create([
            'email' => 'oauth-orchestrator-subject@example.com',
            'password' => null,
        ]);

        $protectedUser = User::factory()->create([
            'email' => 'oauth-orchestrator-protected@example.com',
            'password' => null,
        ]);

        // Assert both users exist.
        $this->assertDatabaseHas('users', ['id' => $subjectUser->id]);
        $this->assertDatabaseHas('users', ['id' => $protectedUser->id]);

        // Required OAuth identity fixtures (exactly 2 for subject, exactly 1 for protected).
        $subjectGoogle = $subjectUser->oauthIdentities()->create([
            'provider' => 'google',
            'provider_user_id' => 'account-delete-oauth-orchestrator-subject-google',
        ]);

        $subjectGithub = $subjectUser->oauthIdentities()->create([
            'provider' => 'github',
            'provider_user_id' => 'account-delete-oauth-orchestrator-subject-github',
        ]);

        $protectedGoogle = $protectedUser->oauthIdentities()->create([
            'provider' => 'google',
            'provider_user_id' => 'account-delete-oauth-orchestrator-protected-google',
        ]);

        // Assert all three OAuthIdentity rows exist and capture fields.
        $this->assertDatabaseHas('oauth_identities', ['id' => $subjectGoogle->id]);
        $this->assertDatabaseHas('oauth_identities', ['id' => $subjectGithub->id]);
        $this->assertDatabaseHas('oauth_identities', ['id' => $protectedGoogle->id]);

        $subjectGoogleId = (int) $subjectGoogle->id;
        $subjectGithubId = (int) $subjectGithub->id;
        $protectedGoogleId = (int) $protectedGoogle->id;

        $subjectGoogleOwnershipSnapshot = $subjectGoogle->user_id;
        $subjectGithubOwnershipSnapshot = $subjectGithub->user_id;
        $protectedOwnershipSnapshot = $protectedGoogle->user_id;

        $subjectGoogleProvider = $subjectGoogle->provider;
        $subjectGoogleProviderUserId = $subjectGoogle->provider_user_id;

        $subjectGithubProvider = $subjectGithub->provider;
        $subjectGithubProviderUserId = $subjectGithub->provider_user_id;

        $protectedProvider = $protectedGoogle->provider;
        $protectedProviderUserId = $protectedGoogle->provider_user_id;

        // Sanctum-token protection (personal_access_tokens.id).
        Sanctum::actingAs($subjectUser);
        $subjectToken = $subjectUser->createToken('account-delete-oauth-orchestrator-subject');

        Sanctum::actingAs($protectedUser);
        $protectedToken = $protectedUser->createToken('account-delete-oauth-orchestrator-protected');

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

        // Reload baseline manifest state.
        $inProgressManifestReloaded = $inProgressManifest->fresh();

        $this->assertSame('in_progress', $inProgressManifestReloaded->status);
        $this->assertSame(1, (int) $inProgressManifestReloaded->attempt_count);
        $this->assertNull($inProgressManifestReloaded->completed_at);
        $this->assertNull($inProgressManifestReloaded->failure_category);
        $this->assertSame('pending', $inProgressManifestReloaded->category_states['oauth_identities']);

        // Assert other nine categories are also pending.
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

        // Capture pre-orchestration manifest fields + complete category map.
        $baseline = [
            'operation_id' => $inProgressManifestReloaded->operation_id,
            'subject_user_id' => $inProgressManifestReloaded->subject_user_id,
            'ownership_snapshot' => $inProgressManifestReloaded->ownership_snapshot,
            'status' => $inProgressManifestReloaded->status,
            'attempt_count' => (int) $inProgressManifestReloaded->attempt_count,
            'last_attempt_at' => $inProgressManifestReloaded->last_attempt_at,
            'completed_at' => $inProgressManifestReloaded->completed_at,
            'failure_category' => $inProgressManifestReloaded->failure_category,
            'created_at' => $inProgressManifestReloaded->created_at,
            'category_states' => $inProgressManifestReloaded->category_states,
        ];

        // Execute only through the (intentionally missing) orchestrator.
        $orchestrator = app(AccountDeleteOAuthIdentitiesCleanupOrchestrator::class);
        $executed = $orchestrator->execute($inProgressManifestReloaded);

        $this->assertTrue($executed);

        // Required cleanup assertions.
        $this->assertNull(OAuthIdentity::query()->find($subjectGoogleId));
        $this->assertNull(OAuthIdentity::query()->find($subjectGithubId));

        $protectedAfter = OAuthIdentity::query()->find($protectedGoogleId);
        $this->assertNotNull($protectedAfter);

        $this->assertSame($protectedOwnershipSnapshot, $protectedAfter->user_id);
        $this->assertSame($protectedProvider, $protectedAfter->provider);
        $this->assertSame($protectedProviderUserId, $protectedAfter->provider_user_id);

        // Both User rows remain.
        $this->assertDatabaseHas('users', ['id' => $subjectUser->id]);
        $this->assertDatabaseHas('users', ['id' => $protectedUser->id]);

        // Both Sanctum token rows remain.
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $subjectPersonalAccessTokenId]);
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $protectedPersonalAccessTokenId]);

        // Reload manifest and required category-bookkeeping.
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

        $this->assertSame($baseline['category_states']['oauth_identities'] === 'pending' ? 'completed' : 'completed', $afterManifestReloaded->category_states['oauth_identities']);

        // Required immutable-field assertions.
        $this->assertSame($baseline['operation_id'], $afterManifestReloaded->operation_id);
        $this->assertSame($baseline['subject_user_id'], $afterManifestReloaded->subject_user_id);
        $this->assertSame($baseline['ownership_snapshot'], $afterManifestReloaded->ownership_snapshot);
        $this->assertSame($baseline['status'], $afterManifestReloaded->status);
        $this->assertSame($baseline['attempt_count'], (int) $afterManifestReloaded->attempt_count);
        $this->assertEquals($baseline['last_attempt_at'], $afterManifestReloaded->last_attempt_at);
        $this->assertNull($afterManifestReloaded->completed_at);
        $this->assertSame($baseline['failure_category'], $afterManifestReloaded->failure_category);
        $this->assertEquals($baseline['created_at'], $afterManifestReloaded->created_at);

        // Ensure overall manifest remains not completed.
        $this->assertSame('in_progress', $afterManifestReloaded->status);

        // Silence unused variables in strict tooling.
        $this->assertSame('google', $subjectGoogleProvider);
        $this->assertSame('account-delete-oauth-orchestrator-subject-google', $subjectGoogleProviderUserId);
        $this->assertSame('github', $subjectGithubProvider);
        $this->assertSame('account-delete-oauth-orchestrator-subject-github', $subjectGithubProviderUserId);
        $this->assertSame($subjectGoogleOwnershipSnapshot, $subjectUser->id);
        $this->assertSame($subjectGithubOwnershipSnapshot, $subjectUser->id);
    }
}

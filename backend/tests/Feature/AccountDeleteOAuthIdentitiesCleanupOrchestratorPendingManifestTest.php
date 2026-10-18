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

class AccountDeleteOAuthIdentitiesCleanupOrchestratorPendingManifestTest extends TestCase
{
    use RefreshDatabase;

    public function test_orchestrator_rejects_pending_manifest_without_cleanup_or_bookkeeping(): void
    {
        $subjectUser = User::factory()->create([
            'email' => 'oauth-orchestrator-pending-subject@example.com',
            'password' => null,
        ]);

        $protectedUser = User::factory()->create([
            'email' => 'oauth-orchestrator-pending-protected@example.com',
            'password' => null,
        ]);

        $this->assertDatabaseHas('users', ['id' => $subjectUser->id]);
        $this->assertDatabaseHas('users', ['id' => $protectedUser->id]);

        // Subject OAuth identities.
        $subjectGoogle = $subjectUser->oauthIdentities()->create([
            'provider' => 'google',
            'provider_user_id' => 'account-delete-oauth-orchestrator-pending-subject-google',
        ]);

        $subjectGithub = $subjectUser->oauthIdentities()->create([
            'provider' => 'github',
            'provider_user_id' => 'account-delete-oauth-orchestrator-pending-subject-github',
        ]);

        // Protected OAuth identity.
        $protectedGoogle = $protectedUser->oauthIdentities()->create([
            'provider' => 'google',
            'provider_user_id' => 'account-delete-oauth-orchestrator-pending-protected-google',
        ]);

        $this->assertDatabaseHas('oauth_identities', ['id' => $subjectGoogle->id]);
        $this->assertDatabaseHas('oauth_identities', ['id' => $subjectGithub->id]);
        $this->assertDatabaseHas('oauth_identities', ['id' => $protectedGoogle->id]);

        // Capture each identity fields.
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

        $protectedGoogleCaptured = [
            'id' => (int) $protectedGoogle->id,
            'user_id' => (int) $protectedGoogle->user_id,
            'provider' => (string) $protectedGoogle->provider,
            'provider_user_id' => (string) $protectedGoogle->provider_user_id,
            'provider_email' => $protectedGoogle->provider_email,
            'avatar_url' => $protectedGoogle->avatar_url,
            'created_at' => $protectedGoogle->created_at,
            'updated_at' => $protectedGoogle->updated_at,
        ];

        // Sanctum-token protection.
        Sanctum::actingAs($subjectUser);
        $subjectToken = $subjectUser->createToken('oauth-orchestrator-pending-subject');

        Sanctum::actingAs($protectedUser);
        $protectedToken = $protectedUser->createToken('oauth-orchestrator-pending-protected');

        $subjectPersonalAccessTokenId = (int) $subjectToken->accessToken->getKey();
        $protectedPersonalAccessTokenId = (int) $protectedToken->accessToken->getKey();

        $this->assertDatabaseHas('personal_access_tokens', ['id' => $subjectPersonalAccessTokenId]);
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $protectedPersonalAccessTokenId]);

        // Manifest setup (do not beginAttempt()).
        $manifestService = app(AccountDeleteCleanupManifestService::class);
        $manifest = $manifestService->createForUser($subjectUser);

        $pendingManifest = $manifest->fresh();

        $this->assertSame('pending', $pendingManifest->status);
        $this->assertSame(0, (int) $pendingManifest->attempt_count);
        $this->assertNull($pendingManifest->last_attempt_at);
        $this->assertNull($pendingManifest->completed_at);
        $this->assertNull($pendingManifest->failure_category);
        $this->assertSame('pending', $pendingManifest->category_states['oauth_identities']);

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
            $this->assertSame('pending', $pendingManifest->category_states[$category]);
        }

        // Capture manifest baseline.
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

        // Execute only through orchestrator.
        $orchestrator = app(AccountDeleteOAuthIdentitiesCleanupOrchestrator::class);
        $executed = $orchestrator->execute($pendingManifest);

        $this->assertFalse($executed);

        // Resource preservation: OAuthIdentity rows remain and are unchanged.
        $this->assertDatabaseHas('oauth_identities', ['id' => $subjectGoogleCaptured['id']]);
        $this->assertDatabaseHas('oauth_identities', ['id' => $subjectGithubCaptured['id']]);
        $this->assertDatabaseHas('oauth_identities', ['id' => $protectedGoogleCaptured['id']]);

        $subjectGoogleAfter = OAuthIdentity::query()->findOrFail($subjectGoogleCaptured['id']);
        $subjectGithubAfter = OAuthIdentity::query()->findOrFail($subjectGithubCaptured['id']);
        $protectedGoogleAfter = OAuthIdentity::query()->findOrFail($protectedGoogleCaptured['id']);

        foreach ([$subjectGoogleAfter, $subjectGithubAfter, $protectedGoogleAfter] as $identityAfter) {
            $this->assertNotNull(OAuthIdentity::query()->find($identityAfter->id));
        }

        $this->assertSame($subjectGoogleCaptured['user_id'], $subjectGoogleAfter->user_id);
        $this->assertSame($subjectGoogleCaptured['provider'], $subjectGoogleAfter->provider);
        $this->assertSame($subjectGoogleCaptured['provider_user_id'], $subjectGoogleAfter->provider_user_id);
        $this->assertEquals($subjectGoogleCaptured['created_at'], $subjectGoogleAfter->created_at);
        $this->assertEquals($subjectGoogleCaptured['updated_at'], $subjectGoogleAfter->updated_at);
        $this->assertSame($subjectGoogleCaptured['provider_email'], $subjectGoogleAfter->provider_email);
        $this->assertSame($subjectGoogleCaptured['avatar_url'], $subjectGoogleAfter->avatar_url);

        $this->assertSame($subjectGithubCaptured['user_id'], $subjectGithubAfter->user_id);
        $this->assertSame($subjectGithubCaptured['provider'], $subjectGithubAfter->provider);
        $this->assertSame($subjectGithubCaptured['provider_user_id'], $subjectGithubAfter->provider_user_id);
        $this->assertEquals($subjectGithubCaptured['created_at'], $subjectGithubAfter->created_at);
        $this->assertEquals($subjectGithubCaptured['updated_at'], $subjectGithubAfter->updated_at);
        $this->assertSame($subjectGithubCaptured['provider_email'], $subjectGithubAfter->provider_email);
        $this->assertSame($subjectGithubCaptured['avatar_url'], $subjectGithubAfter->avatar_url);

        $this->assertSame($protectedGoogleCaptured['user_id'], $protectedGoogleAfter->user_id);
        $this->assertSame($protectedGoogleCaptured['provider'], $protectedGoogleAfter->provider);
        $this->assertSame($protectedGoogleCaptured['provider_user_id'], $protectedGoogleAfter->provider_user_id);
        $this->assertEquals($protectedGoogleCaptured['created_at'], $protectedGoogleAfter->created_at);
        $this->assertEquals($protectedGoogleCaptured['updated_at'], $protectedGoogleAfter->updated_at);
        $this->assertSame($protectedGoogleCaptured['provider_email'], $protectedGoogleAfter->provider_email);
        $this->assertSame($protectedGoogleCaptured['avatar_url'], $protectedGoogleAfter->avatar_url);

        // Users and tokens remain.
        $this->assertDatabaseHas('users', ['id' => $subjectUser->id]);
        $this->assertDatabaseHas('users', ['id' => $protectedUser->id]);

        $this->assertDatabaseHas('personal_access_tokens', ['id' => $subjectPersonalAccessTokenId]);
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $protectedPersonalAccessTokenId]);

        // Manifest immutability assertions.
        $manifestAfterOrchestration = AccountDeleteCleanupManifest::query()->find($pendingManifest->getKey());
        $this->assertNotNull($manifestAfterOrchestration);

        $this->assertSame('pending', $manifestAfterOrchestration->status);
        $this->assertSame(0, (int) $manifestAfterOrchestration->attempt_count);
        $this->assertNull($manifestAfterOrchestration->last_attempt_at);
        $this->assertNull($manifestAfterOrchestration->completed_at);
        $this->assertNull($manifestAfterOrchestration->failure_category);
        $this->assertSame('pending', $manifestAfterOrchestration->category_states['oauth_identities']);

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
            $this->assertSame('pending', $manifestAfterOrchestration->category_states[$category]);
        }

        $this->assertSame($baseline['operation_id'], $manifestAfterOrchestration->operation_id);
        $this->assertSame($baseline['subject_user_id'], $manifestAfterOrchestration->subject_user_id);
        $this->assertEquals($baseline['ownership_snapshot'], $manifestAfterOrchestration->ownership_snapshot);
        $this->assertEquals($baseline['category_states'], $manifestAfterOrchestration->category_states);
        $this->assertSame($baseline['status'], $manifestAfterOrchestration->status);
        $this->assertSame($baseline['attempt_count'], (int) $manifestAfterOrchestration->attempt_count);
        $this->assertNull($manifestAfterOrchestration->last_attempt_at);
        $this->assertNull($manifestAfterOrchestration->completed_at);
        $this->assertNull($manifestAfterOrchestration->failure_category);
        $this->assertEquals($baseline['created_at'], $manifestAfterOrchestration->created_at);
        $this->assertEquals($baseline['updated_at'], $manifestAfterOrchestration->updated_at);
    }
}

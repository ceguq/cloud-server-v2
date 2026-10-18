<?php

namespace Tests\Feature;

use App\Models\OAuthIdentity;
use App\Models\User;
use App\Services\AccountDeleteCleanupManifestService;
use App\Services\AccountDeleteOAuthIdentitiesCleanupService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AccountDeleteOAuthIdentitiesCleanupStaleManifestTest extends TestCase
{
    use RefreshDatabase;

    public function test_oauth_identities_cleanup_rejects_stale_manifest_after_category_was_completed(): void
    {
        $subjectUser = User::factory()->create([
            'email' => 'subject-oauth-stale@example.com',
            'password' => null,
        ]);

        $protectedUser = User::factory()->create([
            'email' => 'protected-oauth-stale@example.com',
            'password' => null,
        ]);

        // Subject OAuth identities.
        $subjectGoogle = $subjectUser->oauthIdentities()->create([
            'provider' => 'google',
            'provider_user_id' => 'account-delete-oauth-stale-google',
        ]);

        $subjectGithub = $subjectUser->oauthIdentities()->create([
            'provider' => 'github',
            'provider_user_id' => 'account-delete-oauth-stale-github',
        ]);

        // Protected OAuth identity.
        $protectedGoogle = $protectedUser->oauthIdentities()->create([
            'provider' => 'google',
            'provider_user_id' => 'account-delete-oauth-stale-protected-google',
        ]);

        $this->assertDatabaseHas('oauth_identities', ['id' => $subjectGoogle->id]);
        $this->assertDatabaseHas('oauth_identities', ['id' => $subjectGithub->id]);
        $this->assertDatabaseHas('oauth_identities', ['id' => $protectedGoogle->id]);
        $this->assertDatabaseHas('users', ['id' => $subjectUser->id]);
        $this->assertDatabaseHas('users', ['id' => $protectedUser->id]);

        // Sanctum-token protection.
        Sanctum::actingAs($subjectUser);
        $subjectToken = $subjectUser->createToken('oauth-stale-subject');

        Sanctum::actingAs($protectedUser);
        $protectedToken = $protectedUser->createToken('oauth-stale-protected');

        $subjectPersonalAccessTokenId = (int) $subjectToken->accessToken->getKey();
        $protectedPersonalAccessTokenId = (int) $protectedToken->accessToken->getKey();

        $this->assertDatabaseHas('personal_access_tokens', ['id' => $subjectPersonalAccessTokenId]);
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $protectedPersonalAccessTokenId]);

        // Manifest setup.
        $manifestService = app(AccountDeleteCleanupManifestService::class);

        $manifest = $manifestService->createForUser($subjectUser);

        $started = $manifestService->beginAttempt($manifest);
        $this->assertTrue($started);

        $staleManifest = $manifest->fresh();

        $this->assertSame('in_progress', $staleManifest->status);
        $this->assertSame(1, (int) $staleManifest->attempt_count);
        $this->assertNull($staleManifest->completed_at);
        $this->assertNull($staleManifest->failure_category);
        $this->assertSame('pending', $staleManifest->category_states['oauth_identities']);

        // Change only authoritative DB state.
        $authoritativeManifest = $manifest->fresh();

        $marked = $manifestService->markCategoryCompleted(
            $authoritativeManifest,
            'oauth_identities',
        );

        $this->assertTrue($marked);

        $authoritativeAfter = $manifest->fresh();
        $this->assertSame('completed', $authoritativeAfter->category_states['oauth_identities']);

        // Assert other nine categories remain pending.
        $this->assertSame('completed', $authoritativeAfter->category_states['oauth_identities']);
        foreach ($authoritativeAfter->category_states as $category => $state) {
            if ($category === 'oauth_identities') {
                continue;
            }
            $this->assertSame('pending', $state);
        }

        // Stale object still locally reports pending.
        $this->assertSame('pending', $staleManifest->category_states['oauth_identities']);

        // Capture authoritative baseline after category completion.
        $baselineManifest = $manifest->fresh();
        $baseline = [
            'operation_id' => $baselineManifest->operation_id,
            'subject_user_id' => $baselineManifest->subject_user_id,
            'ownership_snapshot' => $baselineManifest->ownership_snapshot,
            'category_states' => $baselineManifest->category_states,
            'status' => $baselineManifest->status,
            'attempt_count' => $baselineManifest->attempt_count,
            'last_attempt_at' => $baselineManifest->last_attempt_at,
            'completed_at' => $baselineManifest->completed_at,
            'failure_category' => $baselineManifest->failure_category,
            'created_at' => $baselineManifest->created_at,
            'updated_at' => $baselineManifest->updated_at,
        ];

        $this->assertSame('in_progress', $baseline['status']);
        $this->assertSame('completed', $baseline['category_states']['oauth_identities']);

        // Execute cleanup using stale input.
        $cleanupService = app(AccountDeleteOAuthIdentitiesCleanupService::class);
        $result = $cleanupService->cleanupWithResult($staleManifest);

        $this->assertFalse($result->executed);
        $this->assertSame(0, $result->deletedCount);

        // Required preservation assertions.
        $subjectGoogleFresh = OAuthIdentity::query()->findOrFail($subjectGoogle->id);
        $subjectGithubFresh = OAuthIdentity::query()->findOrFail($subjectGithub->id);
        $protectedGoogleFresh = OAuthIdentity::query()->findOrFail($protectedGoogle->id);

        $this->assertSame($subjectUser->id, $subjectGoogleFresh->user_id);
        $this->assertSame($subjectUser->id, $subjectGithubFresh->user_id);
        $this->assertSame($protectedUser->id, $protectedGoogleFresh->user_id);

        $this->assertSame('google', $subjectGoogleFresh->provider);
        $this->assertSame('github', $subjectGithubFresh->provider);
        $this->assertSame('google', $protectedGoogleFresh->provider);

        $this->assertSame('account-delete-oauth-stale-google', $subjectGoogleFresh->provider_user_id);
        $this->assertSame('account-delete-oauth-stale-github', $subjectGithubFresh->provider_user_id);
        $this->assertSame(
            'account-delete-oauth-stale-protected-google',
            $protectedGoogleFresh->provider_user_id,
        );

        $this->assertDatabaseHas('users', ['id' => $subjectUser->id]);
        $this->assertDatabaseHas('users', ['id' => $protectedUser->id]);

        $this->assertDatabaseHas('personal_access_tokens', ['id' => $subjectPersonalAccessTokenId]);
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $protectedPersonalAccessTokenId]);

        // Required authoritative manifest assertions.
        $manifestAfterCleanup = $manifest->fresh();

        $this->assertSame('in_progress', $manifestAfterCleanup->status);
        $this->assertSame(1, (int) $manifestAfterCleanup->attempt_count);
        $this->assertNull($manifestAfterCleanup->completed_at);
        $this->assertNull($manifestAfterCleanup->failure_category);
        $this->assertSame('completed', $manifestAfterCleanup->category_states['oauth_identities']);

        foreach ($manifestAfterCleanup->category_states as $category => $state) {
            if ($category === 'oauth_identities') {
                continue;
            }
            $this->assertSame('pending', $state);
        }

        $this->assertSame($baseline['operation_id'], $manifestAfterCleanup->operation_id);
        $this->assertSame($baseline['subject_user_id'], $manifestAfterCleanup->subject_user_id);
        $this->assertEquals($baseline['ownership_snapshot'], $manifestAfterCleanup->ownership_snapshot);
        $this->assertEquals($baseline['category_states'], $manifestAfterCleanup->category_states);
        $this->assertSame($baseline['status'], $manifestAfterCleanup->status);
        $this->assertSame($baseline['attempt_count'], $manifestAfterCleanup->attempt_count);
        $this->assertEquals($baseline['last_attempt_at'], $manifestAfterCleanup->last_attempt_at);
        $this->assertNull($manifestAfterCleanup->completed_at);
        $this->assertNull($manifestAfterCleanup->failure_category);

        $this->assertEquals($baseline['created_at'], $manifestAfterCleanup->created_at);
        $this->assertEquals($baseline['updated_at'], $manifestAfterCleanup->updated_at);

        // Required stale-state assertions (local object only).
        $this->assertSame('pending', $staleManifest->category_states['oauth_identities']);
        $this->assertSame('completed', $manifestAfterCleanup->category_states['oauth_identities']);

        // Ensure OAuth identities were not deleted/modified.
        $this->assertDatabaseHas('oauth_identities', ['id' => $subjectGoogle->id, 'provider' => 'google']);
        $this->assertDatabaseHas('oauth_identities', ['id' => $subjectGithub->id, 'provider' => 'github']);
        $this->assertDatabaseHas('oauth_identities', ['id' => $protectedGoogle->id, 'provider' => 'google']);
    }
}

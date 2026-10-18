<?php

namespace Tests\Feature;

use App\Models\AccountDeleteCleanupManifest;
use App\Models\OAuthIdentity;
use App\Models\User;
use App\Services\AccountDeleteCleanupManifestService;
use App\Services\AccountDeleteOAuthIdentitiesCleanupService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AccountDeleteOAuthIdentitiesCleanupPendingManifestTest extends TestCase
{
    use RefreshDatabase;

    public function test_oauth_identities_cleanup_rejects_pending_manifest_without_deleting_identities(): void
    {
        $subjectUser = User::factory()->create([
            'email' => 'subject-oauth-pending@example.com',
            'password' => null,
        ]);

        $protectedUser = User::factory()->create([
            'email' => 'protected-oauth-pending@example.com',
            'password' => null,
        ]);

        // OAuth identities.
        $subjectGoogle = $subjectUser->oauthIdentities()->create([
            'provider' => 'google',
            'provider_user_id' => 'account-delete-oauth-pending-google',
        ]);

        $subjectGithub = $subjectUser->oauthIdentities()->create([
            'provider' => 'github',
            'provider_user_id' => 'account-delete-oauth-pending-github',
        ]);

        $protectedGoogle = $protectedUser->oauthIdentities()->create([
            'provider' => 'google',
            'provider_user_id' => 'account-delete-oauth-pending-protected-google',
        ]);

        $this->assertDatabaseHas('oauth_identities', ['id' => $subjectGoogle->id]);
        $this->assertDatabaseHas('oauth_identities', ['id' => $subjectGithub->id]);
        $this->assertDatabaseHas('oauth_identities', ['id' => $protectedGoogle->id]);

        // Sanctum token protection.
        Sanctum::actingAs($subjectUser);
        $subjectToken = $subjectUser->createToken('pending-oauth-cleanup-subject');

        Sanctum::actingAs($protectedUser);
        $protectedToken = $protectedUser->createToken('pending-oauth-cleanup-protected');

        $subjectPersonalAccessTokenId = (int) $subjectToken->accessToken->getKey();
        $protectedPersonalAccessTokenId = (int) $protectedToken->accessToken->getKey();

        $this->assertDatabaseHas('personal_access_tokens', ['id' => $subjectPersonalAccessTokenId]);
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $protectedPersonalAccessTokenId]);

        // Manifest setup (NO beginAttempt()).
        $manifestService = app(AccountDeleteCleanupManifestService::class);
        $manifest = $manifestService->createForUser($subjectUser);

        $freshManifest = $manifest->fresh();

        $this->assertSame('pending', $freshManifest->status);
        $this->assertSame(0, (int) $freshManifest->attempt_count);
        $this->assertNull($freshManifest->last_attempt_at);
        $this->assertNull($freshManifest->completed_at);
        $this->assertNull($freshManifest->failure_category);

        $categoryStates = is_string($freshManifest->category_states)
            ? json_decode($freshManifest->category_states, true)
            : $freshManifest->category_states;

        $this->assertSame('pending', $categoryStates['oauth_identities']);
        foreach ($categoryStates as $category => $state) {
            $this->assertSame('pending', $state);
        }

        // Capture manifest baseline.
        $baseline = [
            'operation_id' => $freshManifest->operation_id,
            'subject_user_id' => $freshManifest->subject_user_id,
            'ownership_snapshot' => $freshManifest->ownership_snapshot,
            'category_states' => $freshManifest->category_states,
            'status' => $freshManifest->status,
            'attempt_count' => $freshManifest->attempt_count,
            'last_attempt_at' => $freshManifest->last_attempt_at,
            'completed_at' => $freshManifest->completed_at,
            'failure_category' => $freshManifest->failure_category,
            'created_at' => $freshManifest->created_at,
            'updated_at' => $freshManifest->updated_at,
        ];

        // Execute cleanup.
        $cleanupService = app(AccountDeleteOAuthIdentitiesCleanupService::class);
        $result = $cleanupService->cleanupWithResult($freshManifest);

        $this->assertFalse($result->executed);
        $this->assertSame(0, $result->deletedCount);

        // Preservation assertions.
        $this->assertNotNull(OAuthIdentity::query()->find($subjectGoogle->id));
        $this->assertNotNull(OAuthIdentity::query()->find($subjectGithub->id));
        $this->assertNotNull(OAuthIdentity::query()->find($protectedGoogle->id));

        $subjectGoogleFresh = OAuthIdentity::query()->findOrFail($subjectGoogle->id);
        $subjectGithubFresh = OAuthIdentity::query()->findOrFail($subjectGithub->id);
        $protectedGoogleFresh = OAuthIdentity::query()->findOrFail($protectedGoogle->id);

        $this->assertSame('google', $subjectGoogleFresh->provider);
        $this->assertSame('account-delete-oauth-pending-google', $subjectGoogleFresh->provider_user_id);

        $this->assertSame('github', $subjectGithubFresh->provider);
        $this->assertSame('account-delete-oauth-pending-github', $subjectGithubFresh->provider_user_id);

        $this->assertSame('google', $protectedGoogleFresh->provider);
        $this->assertSame('account-delete-oauth-pending-protected-google', $protectedGoogleFresh->provider_user_id);

        $this->assertDatabaseHas('users', ['id' => $subjectUser->id]);
        $this->assertDatabaseHas('users', ['id' => $protectedUser->id]);

        $this->assertDatabaseHas('personal_access_tokens', ['id' => $subjectPersonalAccessTokenId]);
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $protectedPersonalAccessTokenId]);

        // Manifest immutability.
        $manifestAfterCleanup = app(AccountDeleteCleanupManifest::class)
            ->newQuery()
            ->where('operation_id', $baseline['operation_id'])
            ->firstOrFail();

        $this->assertSame('pending', $manifestAfterCleanup->status);
        $this->assertSame(0, (int) $manifestAfterCleanup->attempt_count);
        $this->assertNull($manifestAfterCleanup->last_attempt_at);
        $this->assertNull($manifestAfterCleanup->completed_at);
        $this->assertNull($manifestAfterCleanup->failure_category);

        $afterCategoryStates = is_string($manifestAfterCleanup->category_states)
            ? json_decode($manifestAfterCleanup->category_states, true)
            : $manifestAfterCleanup->category_states;

        $this->assertSame('pending', $afterCategoryStates['oauth_identities']);
        foreach ($afterCategoryStates as $category => $state) {
            $this->assertSame('pending', $state);
        }

        $this->assertSame($baseline['ownership_snapshot'], $manifestAfterCleanup->ownership_snapshot);
        $this->assertEquals($baseline['category_states'], $manifestAfterCleanup->category_states);
        $this->assertEquals($baseline['updated_at'], $manifestAfterCleanup->updated_at);
        $this->assertEquals($baseline['created_at'], $manifestAfterCleanup->created_at);
    }
}

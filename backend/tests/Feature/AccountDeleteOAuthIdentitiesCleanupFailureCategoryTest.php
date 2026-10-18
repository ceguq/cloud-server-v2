<?php

namespace Tests\Feature;

use App\Models\OAuthIdentity;
use App\Models\User;
use App\Services\AccountDeleteCleanupManifestService;
use App\Services\AccountDeleteOAuthIdentitiesCleanupService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AccountDeleteOAuthIdentitiesCleanupFailureCategoryTest extends TestCase
{
    use RefreshDatabase;

    public function test_oauth_identities_cleanup_rejects_manifest_with_failure_category_without_deleting_identities(): void
    {
        $subjectUser = User::factory()->create([
            'email' => 'subject-oauth-failure-category@example.com',
            'password' => null,
        ]);

        $protectedUser = User::factory()->create([
            'email' => 'protected-oauth-failure-category@example.com',
            'password' => null,
        ]);

        $subjectGoogle = $subjectUser->oauthIdentities()->create([
            'provider' => 'google',
            'provider_user_id' => 'account-delete-oauth-failure-category-google',
        ]);

        $subjectGithub = $subjectUser->oauthIdentities()->create([
            'provider' => 'github',
            'provider_user_id' => 'account-delete-oauth-failure-category-github',
        ]);

        $protectedGoogle = $protectedUser->oauthIdentities()->create([
            'provider' => 'google',
            'provider_user_id' => 'account-delete-oauth-failure-category-protected-google',
        ]);

        $this->assertDatabaseHas('oauth_identities', ['id' => $subjectGoogle->id]);
        $this->assertDatabaseHas('oauth_identities', ['id' => $subjectGithub->id]);
        $this->assertDatabaseHas('oauth_identities', ['id' => $protectedGoogle->id]);
        $this->assertDatabaseHas('users', ['id' => $subjectUser->id]);
        $this->assertDatabaseHas('users', ['id' => $protectedUser->id]);

        // Sanctum-token protection.
        Sanctum::actingAs($subjectUser);
        $subjectToken = $subjectUser->createToken('oauth-failure-category-subject');

        Sanctum::actingAs($protectedUser);
        $protectedToken = $protectedUser->createToken('oauth-failure-category-protected');

        $subjectPersonalAccessTokenId = (int) $subjectToken->accessToken->getKey();
        $protectedPersonalAccessTokenId = (int) $protectedToken->accessToken->getKey();

        $this->assertDatabaseHas('personal_access_tokens', ['id' => $subjectPersonalAccessTokenId]);
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $protectedPersonalAccessTokenId]);

        // Manifest setup.
        $manifestService = app(AccountDeleteCleanupManifestService::class);
        $manifest = $manifestService->createForUser($subjectUser);

        $started = $manifestService->beginAttempt($manifest);
        $this->assertTrue($started);

        $freshManifest = $manifest->fresh();

        $this->assertSame('in_progress', $freshManifest->status);
        $this->assertSame(1, (int) $freshManifest->attempt_count);
        $this->assertNull($freshManifest->completed_at);
        $this->assertNull($freshManifest->failure_category);
        $this->assertSame('pending', $freshManifest->category_states['oauth_identities']);

        foreach ($freshManifest->category_states as $category => $state) {
            $this->assertSame('pending', $state);
        }

        // Set failure_category using safe model update.
        $failedManifest = $freshManifest->fresh();
        $failedManifest->failure_category = 'oauth_identities';
        $failedManifest->save();

        $failedManifestReloaded = $failedManifest->fresh();

        $this->assertSame('in_progress', $failedManifestReloaded->status);
        $this->assertSame(1, (int) $failedManifestReloaded->attempt_count);
        $this->assertNull($failedManifestReloaded->completed_at);
        $this->assertSame('oauth_identities', $failedManifestReloaded->failure_category);
        $this->assertSame('pending', $failedManifestReloaded->category_states['oauth_identities']);

        foreach ($failedManifestReloaded->category_states as $category => $state) {
            $this->assertSame('pending', $state);
        }

        // Capture failure-state baseline.
        $baseline = [
            'operation_id' => $failedManifestReloaded->operation_id,
            'subject_user_id' => $failedManifestReloaded->subject_user_id,
            'ownership_snapshot' => $failedManifestReloaded->ownership_snapshot,
            'category_states' => $failedManifestReloaded->category_states,
            'status' => $failedManifestReloaded->status,
            'attempt_count' => $failedManifestReloaded->attempt_count,
            'last_attempt_at' => $failedManifestReloaded->last_attempt_at,
            'completed_at' => $failedManifestReloaded->completed_at,
            'failure_category' => $failedManifestReloaded->failure_category,
            'created_at' => $failedManifestReloaded->created_at,
            'updated_at' => $failedManifestReloaded->updated_at,
        ];

        $this->assertNull($baseline['completed_at']);
        $this->assertSame('oauth_identities', $baseline['failure_category']);
        $this->assertInstanceOf(Carbon::class, $baseline['updated_at']);

        // Execute cleanup.
        $cleanupService = app(AccountDeleteOAuthIdentitiesCleanupService::class);
        $result = $cleanupService->cleanupWithResult($failedManifestReloaded);

        $this->assertFalse($result->executed);
        $this->assertSame(0, $result->deletedCount);

        // Preservation assertions.
        $this->assertDatabaseHas('oauth_identities', ['id' => $subjectGoogle->id]);
        $this->assertDatabaseHas('oauth_identities', ['id' => $subjectGithub->id]);
        $this->assertDatabaseHas('oauth_identities', ['id' => $protectedGoogle->id]);

        $subjectGoogleFresh = OAuthIdentity::query()->findOrFail($subjectGoogle->id);
        $subjectGithubFresh = OAuthIdentity::query()->findOrFail($subjectGithub->id);
        $protectedGoogleFresh = OAuthIdentity::query()->findOrFail($protectedGoogle->id);

        $this->assertSame($subjectUser->id, $subjectGoogleFresh->user_id);
        $this->assertSame($subjectUser->id, $subjectGithubFresh->user_id);
        $this->assertSame($protectedUser->id, $protectedGoogleFresh->user_id);

        $this->assertSame('google', $subjectGoogleFresh->provider);
        $this->assertSame('github', $subjectGithubFresh->provider);
        $this->assertSame('google', $protectedGoogleFresh->provider);

        $this->assertSame('account-delete-oauth-failure-category-google', $subjectGoogleFresh->provider_user_id);
        $this->assertSame('account-delete-oauth-failure-category-github', $subjectGithubFresh->provider_user_id);
        $this->assertSame('account-delete-oauth-failure-category-protected-google', $protectedGoogleFresh->provider_user_id);

        $this->assertDatabaseHas('users', ['id' => $subjectUser->id]);
        $this->assertDatabaseHas('users', ['id' => $protectedUser->id]);

        $this->assertDatabaseHas('personal_access_tokens', ['id' => $subjectPersonalAccessTokenId]);
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $protectedPersonalAccessTokenId]);

        // Required manifest immutability assertions.
        $manifestAfterCleanup = $failedManifestReloaded->fresh();

        $this->assertSame('in_progress', $manifestAfterCleanup->status);
        $this->assertSame(1, (int) $manifestAfterCleanup->attempt_count);
        $this->assertNull($manifestAfterCleanup->completed_at);
        $this->assertSame('oauth_identities', $manifestAfterCleanup->failure_category);

        $this->assertSame('pending', $manifestAfterCleanup->category_states['oauth_identities']);
        foreach ($manifestAfterCleanup->category_states as $category => $state) {
            $this->assertSame('pending', $state);
        }

        // Baseline field immutability.
        $this->assertEquals($baseline['updated_at'], $manifestAfterCleanup->updated_at);
        $this->assertEquals($baseline['created_at'], $manifestAfterCleanup->created_at);

        $this->assertEquals($baseline['operation_id'], $manifestAfterCleanup->operation_id);
        $this->assertEquals($baseline['subject_user_id'], $manifestAfterCleanup->subject_user_id);
        $this->assertEquals($baseline['ownership_snapshot'], $manifestAfterCleanup->ownership_snapshot);
        $this->assertEquals($baseline['category_states'], $manifestAfterCleanup->category_states);
        $this->assertEquals($baseline['status'], $manifestAfterCleanup->status);
        $this->assertEquals($baseline['attempt_count'], $manifestAfterCleanup->attempt_count);
        $this->assertEquals($baseline['last_attempt_at'], $manifestAfterCleanup->last_attempt_at);
        $this->assertNull($manifestAfterCleanup->completed_at);
        $this->assertEquals($baseline['failure_category'], $manifestAfterCleanup->failure_category);
    }
}

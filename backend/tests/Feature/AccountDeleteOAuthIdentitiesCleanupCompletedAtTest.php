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

class AccountDeleteOAuthIdentitiesCleanupCompletedAtTest extends TestCase
{
    use RefreshDatabase;

    public function test_oauth_identities_cleanup_rejects_manifest_with_completed_at_without_deleting_identities(): void
    {
        $subjectUser = User::factory()->create([
            'email' => 'subject-oauth-completed-at@example.com',
            'password' => null,
        ]);

        $protectedUser = User::factory()->create([
            'email' => 'protected-oauth-completed-at@example.com',
            'password' => null,
        ]);

        // OAuth identities.
        $subjectGoogle = $subjectUser->oauthIdentities()->create([
            'provider' => 'google',
            'provider_user_id' => 'account-delete-oauth-completed-at-google',
        ]);

        $subjectGithub = $subjectUser->oauthIdentities()->create([
            'provider' => 'github',
            'provider_user_id' => 'account-delete-oauth-completed-at-github',
        ]);

        $protectedGoogle = $protectedUser->oauthIdentities()->create([
            'provider' => 'google',
            'provider_user_id' => 'account-delete-oauth-completed-at-protected-google',
        ]);

        $this->assertDatabaseHas('oauth_identities', ['id' => $subjectGoogle->id]);
        $this->assertDatabaseHas('oauth_identities', ['id' => $subjectGithub->id]);
        $this->assertDatabaseHas('oauth_identities', ['id' => $protectedGoogle->id]);
        $this->assertDatabaseHas('users', ['id' => $subjectUser->id]);
        $this->assertDatabaseHas('users', ['id' => $protectedUser->id]);

        // Sanctum-token protection.
        Sanctum::actingAs($subjectUser);
        $subjectToken = $subjectUser->createToken('oauth-completed-at-subject');

        Sanctum::actingAs($protectedUser);
        $protectedToken = $protectedUser->createToken('oauth-completed-at-protected');

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

        // Assert other authorized categories are pending.
        foreach ($freshManifest->category_states as $category => $state) {
            $this->assertSame('pending', $state);
        }

        // Set completed_at using safe model update.
        $completedAtManifest = $freshManifest->fresh();
        $now = now('UTC');
        $completedAtManifest->completed_at = $now;
        $completedAtManifest->save();

        $completedAtManifestReloaded = $completedAtManifest->fresh();

        $this->assertSame('in_progress', $completedAtManifestReloaded->status);
        $this->assertSame(1, (int) $completedAtManifestReloaded->attempt_count);
        $this->assertNotNull($completedAtManifestReloaded->completed_at);
        $this->assertNull($completedAtManifestReloaded->failure_category);
        $this->assertSame('pending', $completedAtManifestReloaded->category_states['oauth_identities']);

        foreach ($completedAtManifestReloaded->category_states as $category => $state) {
            $this->assertSame('pending', $state);
        }

        $this->assertInstanceOf(Carbon::class, $completedAtManifestReloaded->completed_at);

        // Capture completed_at baseline.
        $baseline = [
            'operation_id' => $completedAtManifestReloaded->operation_id,
            'subject_user_id' => $completedAtManifestReloaded->subject_user_id,
            'ownership_snapshot' => $completedAtManifestReloaded->ownership_snapshot,
            'category_states' => $completedAtManifestReloaded->category_states,
            'status' => $completedAtManifestReloaded->status,
            'attempt_count' => $completedAtManifestReloaded->attempt_count,
            'last_attempt_at' => $completedAtManifestReloaded->last_attempt_at,
            'completed_at' => $completedAtManifestReloaded->completed_at,
            'failure_category' => $completedAtManifestReloaded->failure_category,
            'created_at' => $completedAtManifestReloaded->created_at,
            'updated_at' => $completedAtManifestReloaded->updated_at,
        ];

        $this->assertNotNull($baseline['completed_at']);

        // Execute cleanup.
        $cleanupService = app(AccountDeleteOAuthIdentitiesCleanupService::class);
        $result = $cleanupService->cleanupWithResult($completedAtManifestReloaded);

        $this->assertFalse($result->executed);
        $this->assertSame(0, $result->deletedCount);

        // Required preservation assertions.
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

        $this->assertSame('account-delete-oauth-completed-at-google', $subjectGoogleFresh->provider_user_id);
        $this->assertSame('account-delete-oauth-completed-at-github', $subjectGithubFresh->provider_user_id);
        $this->assertSame(
            'account-delete-oauth-completed-at-protected-google',
            $protectedGoogleFresh->provider_user_id,
        );

        $this->assertDatabaseHas('users', ['id' => $subjectUser->id]);
        $this->assertDatabaseHas('users', ['id' => $protectedUser->id]);

        $this->assertDatabaseHas('personal_access_tokens', ['id' => $subjectPersonalAccessTokenId]);
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $protectedPersonalAccessTokenId]);

        // Required manifest immutability assertions.
        $manifestAfterCleanup = $completedAtManifestReloaded->fresh();

        $this->assertSame('in_progress', $manifestAfterCleanup->status);
        $this->assertSame(1, (int) $manifestAfterCleanup->attempt_count);
        $this->assertNull($manifestAfterCleanup->failure_category);

        $this->assertSame('pending', $manifestAfterCleanup->category_states['oauth_identities']);
        foreach ($manifestAfterCleanup->category_states as $category => $state) {
            $this->assertSame('pending', $state);
        }

        $this->assertEquals($baseline['completed_at'], $manifestAfterCleanup->completed_at);
        $this->assertEquals($baseline['updated_at'], $manifestAfterCleanup->updated_at);

        $this->assertEquals($baseline['operation_id'], $manifestAfterCleanup->operation_id);
        $this->assertEquals($baseline['subject_user_id'], $manifestAfterCleanup->subject_user_id);
        $this->assertEquals($baseline['ownership_snapshot'], $manifestAfterCleanup->ownership_snapshot);
        $this->assertEquals($baseline['category_states'], $manifestAfterCleanup->category_states);
        $this->assertEquals($baseline['status'], $manifestAfterCleanup->status);
        $this->assertEquals($baseline['attempt_count'], $manifestAfterCleanup->attempt_count);
        $this->assertEquals($baseline['last_attempt_at'], $manifestAfterCleanup->last_attempt_at);
        $this->assertNull($manifestAfterCleanup->failure_category);
        $this->assertEquals($baseline['created_at'], $manifestAfterCleanup->created_at);
    }
}

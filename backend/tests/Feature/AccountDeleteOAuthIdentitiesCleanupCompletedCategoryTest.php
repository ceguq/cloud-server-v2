<?php

namespace Tests\Feature;

use App\Models\OAuthIdentity;
use App\Models\User;
use App\Services\AccountDeleteCleanupManifestService;
use App\Services\AccountDeleteOAuthIdentitiesCleanupService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AccountDeleteOAuthIdentitiesCleanupCompletedCategoryTest extends TestCase
{
    use RefreshDatabase;

    public function test_oauth_identities_cleanup_rejects_completed_category_without_deleting_identities(): void
    {
        $subjectUser = User::factory()->create([
            'email' => 'subject-oauth-completed@example.com',
            'password' => null,
        ]);

        $protectedUser = User::factory()->create([
            'email' => 'protected-oauth-completed@example.com',
            'password' => null,
        ]);

        $subjectGoogle = $subjectUser->oauthIdentities()->create([
            'provider' => 'google',
            'provider_user_id' => 'account-delete-oauth-completed-google',
        ]);

        $subjectGithub = $subjectUser->oauthIdentities()->create([
            'provider' => 'github',
            'provider_user_id' => 'account-delete-oauth-completed-github',
        ]);

        $protectedGoogle = $protectedUser->oauthIdentities()->create([
            'provider' => 'google',
            'provider_user_id' => 'account-delete-oauth-completed-protected-google',
        ]);

        $this->assertDatabaseHas('oauth_identities', ['id' => $subjectGoogle->id]);
        $this->assertDatabaseHas('oauth_identities', ['id' => $subjectGithub->id]);
        $this->assertDatabaseHas('oauth_identities', ['id' => $protectedGoogle->id]);
        $this->assertDatabaseHas('users', ['id' => $subjectUser->id]);
        $this->assertDatabaseHas('users', ['id' => $protectedUser->id]);

        Sanctum::actingAs($subjectUser);
        $subjectToken = $subjectUser->createToken('oauth-completed-subject');

        Sanctum::actingAs($protectedUser);
        $protectedToken = $protectedUser->createToken('oauth-completed-protected');

        $subjectPersonalAccessTokenId = (int) $subjectToken->accessToken->getKey();
        $protectedPersonalAccessTokenId = (int) $protectedToken->accessToken->getKey();

        $this->assertDatabaseHas('personal_access_tokens', ['id' => $subjectPersonalAccessTokenId]);
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $protectedPersonalAccessTokenId]);

        $manifestService = app(AccountDeleteCleanupManifestService::class);

        $manifest = $manifestService->createForUser($subjectUser);

        $started = $manifestService->beginAttempt($manifest);
        $this->assertTrue($started);

        $inProgressManifest = $manifest->fresh();
        $this->assertSame('in_progress', $inProgressManifest->status);
        $this->assertSame(1, (int) $inProgressManifest->attempt_count);
        $this->assertNull($inProgressManifest->completed_at);
        $this->assertNull($inProgressManifest->failure_category);
        $this->assertSame('pending', $inProgressManifest->category_states['oauth_identities']);

        $marked = $manifestService->markCategoryCompleted(
            $inProgressManifest,
            'oauth_identities',
        );
        $this->assertTrue($marked);

        $completedManifest = $manifest->fresh();
        $this->assertSame('in_progress', $completedManifest->status);
        $this->assertSame(1, (int) $completedManifest->attempt_count);
        $this->assertNull($completedManifest->completed_at);
        $this->assertNull($completedManifest->failure_category);
        $this->assertSame('completed', $completedManifest->category_states['oauth_identities']);

        foreach ($completedManifest->category_states as $category => $state) {
            if ($category === 'oauth_identities') {
                continue;
            }
            $this->assertSame('pending', $state);
        }

        // Capture completed-state baseline.
        $baseline = [
            'operation_id' => $completedManifest->operation_id,
            'subject_user_id' => $completedManifest->subject_user_id,
            'ownership_snapshot' => $completedManifest->ownership_snapshot,
            'category_states' => $completedManifest->category_states,
            'status' => $completedManifest->status,
            'attempt_count' => $completedManifest->attempt_count,
            'last_attempt_at' => $completedManifest->last_attempt_at,
            'completed_at' => $completedManifest->completed_at,
            'failure_category' => $completedManifest->failure_category,
            'created_at' => $completedManifest->created_at,
            'updated_at' => $completedManifest->updated_at,
        ];

        $cleanupService = app(AccountDeleteOAuthIdentitiesCleanupService::class);
        $result = $cleanupService->cleanupWithResult($completedManifest);

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

        $this->assertSame('account-delete-oauth-completed-google', $subjectGoogleFresh->provider_user_id);
        $this->assertSame('account-delete-oauth-completed-github', $subjectGithubFresh->provider_user_id);
        $this->assertSame(
            'account-delete-oauth-completed-protected-google',
            $protectedGoogleFresh->provider_user_id,
        );

        $this->assertDatabaseHas('users', ['id' => $subjectUser->id]);
        $this->assertDatabaseHas('users', ['id' => $protectedUser->id]);

        $this->assertDatabaseHas('personal_access_tokens', ['id' => $subjectPersonalAccessTokenId]);
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $protectedPersonalAccessTokenId]);

        // Manifest immutability.
        $manifestAfterCleanup = $completedManifest->fresh();

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
    }
}

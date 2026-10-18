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

class AccountDeleteOAuthIdentitiesCleanupResultContractTest extends TestCase
{
    use RefreshDatabase;

    public function test_cleanup_result_distinguishes_rejected_zero_from_eligible_zero(): void
    {
        $manifestService = app(AccountDeleteCleanupManifestService::class);
        $cleanupService = app(AccountDeleteOAuthIdentitiesCleanupService::class);

        // ==========================
        // Scenario 1 — Rejected zero
        // ==========================
        $rejectedUser = User::factory()->create([
            'email' => 'subject-oauth-result-rejected@example.com',
            'password' => null,
        ]);

        $rejectedIdentity = $rejectedUser->oauthIdentities()->create([
            'provider' => 'google',
            'provider_user_id' => 'account-delete-oauth-result-rejected-google',
        ]);

        Sanctum::actingAs($rejectedUser);
        $rejectedToken = $rejectedUser->createToken('oauth-result-rejected');

        $rejectedPersonalAccessTokenId = (int) $rejectedToken->accessToken->getKey();

        $this->assertDatabaseHas('users', ['id' => $rejectedUser->id]);
        $this->assertDatabaseHas('oauth_identities', ['id' => $rejectedIdentity->id]);
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $rejectedPersonalAccessTokenId]);

        $rejectedManifest = $manifestService->createForUser($rejectedUser);
        $rejectedManifestReloaded = $rejectedManifest->fresh();

        $this->assertSame('pending', $rejectedManifestReloaded->status);
        $this->assertSame(0, (int) $rejectedManifestReloaded->attempt_count);
        $this->assertNull($rejectedManifestReloaded->last_attempt_at);
        $this->assertNull($rejectedManifestReloaded->completed_at);
        $this->assertNull($rejectedManifestReloaded->failure_category);
        $this->assertSame('pending', $rejectedManifestReloaded->category_states['oauth_identities']);

        foreach ($rejectedManifestReloaded->category_states as $category => $state) {
            $this->assertSame('pending', $state);
        }

        $rejectedBaseline = [
            'operation_id' => $rejectedManifestReloaded->operation_id,
            'subject_user_id' => $rejectedManifestReloaded->subject_user_id,
            'ownership_snapshot' => $rejectedManifestReloaded->ownership_snapshot,
            'category_states' => $rejectedManifestReloaded->category_states,
            'status' => $rejectedManifestReloaded->status,
            'attempt_count' => $rejectedManifestReloaded->attempt_count,
            'last_attempt_at' => $rejectedManifestReloaded->last_attempt_at,
            'completed_at' => $rejectedManifestReloaded->completed_at,
            'failure_category' => $rejectedManifestReloaded->failure_category,
            'created_at' => $rejectedManifestReloaded->created_at,
            'updated_at' => $rejectedManifestReloaded->updated_at,
        ];

        $rejectedResult = $cleanupService->cleanupWithResult(
            $rejectedManifestReloaded->fresh(),
        );

        $this->assertFalse($rejectedResult->executed);
        $this->assertSame(0, $rejectedResult->deletedCount);

        // Preservation for rejected scenario.
        $rejectedIdentityAfter = OAuthIdentity::query()->findOrFail($rejectedIdentity->id);
        $this->assertSame($rejectedUser->id, $rejectedIdentityAfter->user_id);
        $this->assertSame('google', $rejectedIdentityAfter->provider);
        $this->assertSame(
            'account-delete-oauth-result-rejected-google',
            $rejectedIdentityAfter->provider_user_id,
        );

        $this->assertDatabaseHas('users', ['id' => $rejectedUser->id]);
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $rejectedPersonalAccessTokenId]);

        $rejectedManifestAfterCleanup = $rejectedManifestReloaded->fresh();
        $this->assertSame('pending', $rejectedManifestAfterCleanup->status);
        $this->assertSame(0, (int) $rejectedManifestAfterCleanup->attempt_count);
        $this->assertNull($rejectedManifestAfterCleanup->last_attempt_at);
        $this->assertNull($rejectedManifestAfterCleanup->completed_at);
        $this->assertNull($rejectedManifestAfterCleanup->failure_category);
        $this->assertSame('pending', $rejectedManifestAfterCleanup->category_states['oauth_identities']);

        foreach ($rejectedManifestAfterCleanup->category_states as $category => $state) {
            $this->assertSame('pending', $state);
        }

        // Carbon timestamps: value equality.
        $this->assertEquals($rejectedBaseline['created_at'], $rejectedManifestAfterCleanup->created_at);
        $this->assertEquals($rejectedBaseline['updated_at'], $rejectedManifestAfterCleanup->updated_at);
        $this->assertEquals($rejectedBaseline['category_states'], $rejectedManifestAfterCleanup->category_states);
        $this->assertEquals($rejectedBaseline['ownership_snapshot'], $rejectedManifestAfterCleanup->ownership_snapshot);

        // ==========================
        // Scenario 2 — Eligible zero
        // ==========================
        $eligibleUser = User::factory()->create([
            'email' => 'subject-oauth-result-eligible@example.com',
            'password' => null,
        ]);

        // Eligible user is expected to own zero OAuth identities at this point (before creating the protected identity).
        $this->assertSame(
            0,
            OAuthIdentity::query()
                ->where('user_id', $eligibleUser->id)
                ->count(),
        );

        Sanctum::actingAs($eligibleUser);
        $eligibleToken = $eligibleUser->createToken('oauth-result-eligible');
        $eligiblePersonalAccessTokenId = (int) $eligibleToken->accessToken->getKey();

        $this->assertDatabaseHas('users', ['id' => $eligibleUser->id]);
        $this->assertSame(0, $eligibleUser->oauthIdentities()->count());
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $eligiblePersonalAccessTokenId]);

        $protectedUser = User::factory()->create([
            'email' => 'protected-oauth-result-eligible@example.com',
            'password' => null,
        ]);

        $protectedIdentity = $protectedUser->oauthIdentities()->create([
            'provider' => 'github',
            'provider_user_id' => 'account-delete-oauth-result-protected-github',
        ]);

        Sanctum::actingAs($protectedUser);
        $protectedToken = $protectedUser->createToken('oauth-result-protected');
        $protectedPersonalAccessTokenId = (int) $protectedToken->accessToken->getKey();

        $this->assertDatabaseHas('users', ['id' => $protectedUser->id]);
        $this->assertDatabaseHas('oauth_identities', ['id' => $protectedIdentity->id]);
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $protectedPersonalAccessTokenId]);

        $eligibleManifest = $manifestService->createForUser($eligibleUser);
        $started = $manifestService->beginAttempt($eligibleManifest);
        $this->assertTrue($started);

        $eligibleManifestReloaded = $eligibleManifest->fresh();

        $this->assertSame('in_progress', $eligibleManifestReloaded->status);
        $this->assertSame(1, (int) $eligibleManifestReloaded->attempt_count);
        $this->assertNull($eligibleManifestReloaded->completed_at);
        $this->assertNull($eligibleManifestReloaded->failure_category);
        $this->assertSame('pending', $eligibleManifestReloaded->category_states['oauth_identities']);

        foreach ($eligibleManifestReloaded->category_states as $category => $state) {
            $this->assertSame('pending', $state);
        }

        $eligibleBaseline = [
            'updated_at' => $eligibleManifestReloaded->updated_at,
            'operation_id' => $eligibleManifestReloaded->operation_id,
            'subject_user_id' => $eligibleManifestReloaded->subject_user_id,
            'ownership_snapshot' => $eligibleManifestReloaded->ownership_snapshot,
            'category_states' => $eligibleManifestReloaded->category_states,
            'status' => $eligibleManifestReloaded->status,
            'attempt_count' => $eligibleManifestReloaded->attempt_count,
            'last_attempt_at' => $eligibleManifestReloaded->last_attempt_at,
            'completed_at' => $eligibleManifestReloaded->completed_at,
            'failure_category' => $eligibleManifestReloaded->failure_category,
            'created_at' => $eligibleManifestReloaded->created_at,
        ];

        $eligibleResult = $cleanupService->cleanupWithResult(
            $eligibleManifestReloaded->fresh(),
        );

        $this->assertTrue($eligibleResult->executed);
        $this->assertSame(0, $eligibleResult->deletedCount);

        // Central contract contrast.
        $this->assertFalse($rejectedResult->executed);
        $this->assertTrue($eligibleResult->executed);
        $this->assertSame(0, $rejectedResult->deletedCount);
        $this->assertSame(0, $eligibleResult->deletedCount);

        // Preservation for eligible-zero scenario.
        $this->assertSame(0, $eligibleUser->oauthIdentities()->count());

        $protectedIdentityAfter = OAuthIdentity::query()->findOrFail($protectedIdentity->id);
        $this->assertSame($protectedUser->id, $protectedIdentityAfter->user_id);
        $this->assertSame('github', $protectedIdentityAfter->provider);
        $this->assertSame(
            'account-delete-oauth-result-protected-github',
            $protectedIdentityAfter->provider_user_id,
        );

        $this->assertDatabaseHas('users', ['id' => $eligibleUser->id]);
        $this->assertDatabaseHas('users', ['id' => $protectedUser->id]);

        $this->assertDatabaseHas('personal_access_tokens', ['id' => $eligiblePersonalAccessTokenId]);
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $protectedPersonalAccessTokenId]);

        $eligibleManifestAfterCleanup = $eligibleManifestReloaded->fresh();

        $this->assertSame('in_progress', $eligibleManifestAfterCleanup->status);
        $this->assertSame(1, (int) $eligibleManifestAfterCleanup->attempt_count);
        $this->assertNull($eligibleManifestAfterCleanup->completed_at);
        $this->assertNull($eligibleManifestAfterCleanup->failure_category);
        $this->assertSame('pending', $eligibleManifestAfterCleanup->category_states['oauth_identities']);
        foreach ($eligibleManifestAfterCleanup->category_states as $category => $state) {
            $this->assertSame('pending', $state);
        }

        // Manifest bookkeeping remains unchanged; use Carbon value equality.
        $this->assertEquals($eligibleBaseline['updated_at'], $eligibleManifestAfterCleanup->updated_at);
        $this->assertEquals($eligibleBaseline['created_at'], $eligibleManifestAfterCleanup->created_at);
        $this->assertEquals($eligibleBaseline['ownership_snapshot'], $eligibleManifestAfterCleanup->ownership_snapshot);
        $this->assertEquals($eligibleBaseline['category_states'], $eligibleManifestAfterCleanup->category_states);
        $this->assertEquals($eligibleBaseline['operation_id'], $eligibleManifestAfterCleanup->operation_id);
        $this->assertEquals($eligibleBaseline['subject_user_id'], $eligibleManifestAfterCleanup->subject_user_id);
        $this->assertEquals($eligibleBaseline['last_attempt_at'], $eligibleManifestAfterCleanup->last_attempt_at);

        $this->assertInstanceOf(Carbon::class, $eligibleManifestAfterCleanup->last_attempt_at);
    }
}

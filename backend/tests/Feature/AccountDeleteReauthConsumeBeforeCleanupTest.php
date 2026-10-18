<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Services\AccountDeleteReauthService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Laravel\Sanctum\PersonalAccessToken;
use Tests\TestCase;

final class AccountDeleteReauthConsumeBeforeCleanupTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config(['cache.default' => 'file']);
        app('cache')->setDefaultDriver('file');
        Cache::store('file')->flush();

        Carbon::setTestNow();
    }

    protected function tearDown(): void
    {
        config(['cache.default' => 'file']);
        app('cache')->setDefaultDriver('file');
        Cache::store('file')->flush();

        Carbon::setTestNow();

        parent::tearDown();
    }

    public function test_verified_reauthentication_challenge_is_consumed_before_cleanup_invocation(): void
    {
        // ── Fixtures ─────────────────────────────────────────────────────────

        $subjectUser = User::factory()->create([
            'email' => 'account-delete-consume-before-cleanup-subject@example.com',
            'password' => null,
        ]);

        $secondUser = User::factory()->create([
            'email' => 'account-delete-consume-before-cleanup-second@example.com',
            'password' => null,
        ]);

        // OAuth-only contract requires a connected login identity.
        $subjectUser->oauthIdentities()->create([
            'provider' => 'google',
            'provider_user_id' => 'account-delete-consume-before-cleanup-google-subject',
            'provider_email' => 'account-delete-consume-before-cleanup-subject@example.com',
            'avatar_url' => null,
        ]);

        $secondUser->oauthIdentities()->create([
            'provider' => 'github',
            'provider_user_id' => 'account-delete-consume-before-cleanup-github-second',
            'provider_email' => 'account-delete-consume-before-cleanup-second@example.com',
            'avatar_url' => null,
        ]);

        // Authenticated Sanctum token for the subject User (used for the API request).
        $authenticatedToken = $subjectUser->createToken(
            'account-delete-consume-before-cleanup-authenticated-token',
        );
        $authenticatedAccessTokenId = (int) $authenticatedToken->accessToken->getKey();

        // Additional Sanctum token owned by the subject User.
        $additionalSubjectToken = $subjectUser->createToken(
            'account-delete-consume-before-cleanup-additional-subject-token',
        );
        $additionalSubjectTokenId = (int) $additionalSubjectToken->accessToken->getKey();

        // Sanctum token owned by the second User.
        $secondUserToken = $secondUser->createToken(
            'account-delete-consume-before-cleanup-second-user-token',
        );
        $secondUserTokenId = (int) $secondUserToken->accessToken->getKey();

        $userMorphType = $subjectUser->getMorphClass();
        $secondUserMorphType = $secondUser->getMorphClass();

        // Confirm tokens exist.
        $this->assertDatabaseHas('personal_access_tokens', [
            'id' => $authenticatedAccessTokenId,
            'tokenable_type' => $userMorphType,
            'tokenable_id' => $subjectUser->id,
        ]);
        $this->assertDatabaseHas('personal_access_tokens', [
            'id' => $additionalSubjectTokenId,
            'tokenable_type' => $userMorphType,
            'tokenable_id' => $subjectUser->id,
        ]);
        $this->assertDatabaseHas('personal_access_tokens', [
            'id' => $secondUserTokenId,
            'tokenable_type' => $secondUserMorphType,
            'tokenable_id' => $secondUser->id,
        ]);

        // Issue and verify a real delete-account reauthentication challenge.
        $reauthService = app(AccountDeleteReauthService::class);

        $issued = $reauthService->issue(
            userId: (int) $subjectUser->id,
            accessTokenId: $authenticatedAccessTokenId,
            provider: 'google',
            providerUserId: 'account-delete-consume-before-cleanup-google-subject',
        );

        $challengeId = $issued['challenge'];

        $verified = $reauthService->verify(
            state: $issued['state'],
            provider: 'google',
            providerUserId: 'account-delete-consume-before-cleanup-google-subject',
        );

        $this->assertTrue($verified);

        // ── Precondition assertion ───────────────────────────────────────────

        $this->assertSame(
            'verified',
            $reauthService->status(
                challengeId: $challengeId,
                userId: (int) $subjectUser->id,
                accessTokenId: $authenticatedAccessTokenId,
            ),
        );

        // ── Snapshot ─────────────────────────────────────────────────────────

        $subjectUserId = (int) $subjectUser->id;
        $secondUserId = (int) $secondUser->id;

        $secondUserTokenCountBefore = PersonalAccessToken::query()
            ->where('tokenable_type', $secondUserMorphType)
            ->where('tokenable_id', $secondUserId)
            ->count();

        // ── Act ──────────────────────────────────────────────────────────────

        $response = $this->deleteJson('/api/account', [
            'email' => $subjectUser->email,
            'challenge_id' => $challengeId,
            'confirm_delete' => true,
        ], [
            'Authorization' => 'Bearer '.$authenticatedToken->plainTextToken,
        ]);

        // ── Assertions ───────────────────────────────────────────────────────

        // 1. A completed cleanup returns the established success response.
        $response->assertOk();
        $response->assertExactJson([
            'message' => 'Account deleted successfully.',
        ]);

        // 2. After the request, the challenge status is exactly 'consumed'.
        $this->assertSame(
            'consumed',
            $reauthService->status(
                challengeId: $challengeId,
                userId: $subjectUserId,
                accessTokenId: $authenticatedAccessTokenId,
            ),
        );

        // 3. The same challenge cannot be consumed again.
        $this->assertFalse(
            $reauthService->consume(
                challengeId: $challengeId,
                userId: $subjectUserId,
                accessTokenId: $authenticatedAccessTokenId,
            ),
        );

        // 4. Cleanup removed the subject while preserving the unrelated User.
        $this->assertNull(User::query()->find($subjectUserId));
        $this->assertNotNull(User::query()->find($secondUserId));
        $this->assertDatabaseHas('account_delete_cleanup_manifests', [
            'subject_user_id' => $subjectUserId,
            'status' => 'completed',
        ]);
        $this->assertDatabaseMissing('personal_access_tokens', ['id' => $authenticatedAccessTokenId]);
        $this->assertDatabaseMissing('personal_access_tokens', ['id' => $additionalSubjectTokenId]);
        $this->assertNotNull(PersonalAccessToken::query()->find($secondUserTokenId));

        $this->assertSame(0, PersonalAccessToken::query()
            ->where('tokenable_type', $userMorphType)
            ->where('tokenable_id', $subjectUserId)
            ->count());

        $this->assertSame(
            $secondUserTokenCountBefore,
            PersonalAccessToken::query()
                ->where('tokenable_type', $secondUserMorphType)
                ->where('tokenable_id', $secondUserId)
                ->count(),
        );
    }
}

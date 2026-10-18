<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\AccountDeleteReauthService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class AccountDeleteControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Align with the existing reauth tests that require persistent cache.
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

    public function test_final_account_delete_rejects_an_unverified_reauthentication_challenge(): void
    {
        // The finalized OpenSpec proposes:
        // - DELETE /api/account
        // - request JSON must include confirm_delete === true
        // - OAuth-only deletion requires a verified delete-reauth challenge,
        //   supplied via the request field challenge_id.

        $user = User::factory()->create([
            'email' => 'oauth-only@example.com',
            'password' => null,
        ]);

        // The OAuth-only contract requires a connected login identity.
        $user->oauthIdentities()->create([
            'provider' => 'google',
            'provider_user_id' => 'google-user-123',
            'provider_email' => 'oauth-only@example.com',
            'avatar_url' => null,
        ]);

        $token = $user->createToken('account-delete-test');

        $issued = app(AccountDeleteReauthService::class)->issue(
            userId: (int) $user->id,
            accessTokenId: (int) $token->accessToken->getKey(),
            provider: 'google',
            providerUserId: 'google-user-123',
        );

        // Contract: deletion must not occur when the challenge is issued but unverified.
        $this->assertSame(
            'pending',
            app(AccountDeleteReauthService::class)->status(
                challengeId: $issued['challenge'],
                userId: (int) $user->id,
                accessTokenId: (int) $token->accessToken->getKey(),
            ),
        );

        $response = $this->deleteJson('/api/account', [
            'email' => $user->email,
            'challenge_id' => $issued['challenge'],
            'confirm_delete' => true,
        ], [
            'Authorization' => 'Bearer '.$token->plainTextToken,
        ]);

        // Since the production endpoint is not implemented yet, this test is expected to fail.
        // The assertions below capture the security expectation from the OpenSpec.
        $response->assertStatus(422);

        $response->assertJsonStructure([
            'message',
            'errors',
        ]);

        $this->assertNotEmpty($response->json('errors'));

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'email' => $user->email,
        ]);

        $this->assertFalse(
            is_array($response->json()) &&
                (($response->json()['message'] ?? null) === 'Account deleted successfully.'),
            'Unverified reauthentication must not result in successful deletion message.',
        );
    }

    private function assertResponseDidNotReportSuccess($response): void
    {
        if (! is_array($response->json())) {
            return;
        }

        $this->assertNotSame(
            'Account deleted successfully.',
            $response->json('message'),
        );
    }
}

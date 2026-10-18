<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\AccountDeleteReauthService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Laravel\Sanctum\Sanctum;
use Laravel\Socialite\Facades\Socialite;
use Mockery;
use Tests\TestCase;

class AccountDeleteReauthControllerTest extends TestCase
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
        Mockery::close();

        parent::tearDown();
    }

    public function test_start_requires_authentication(): void
    {
        $this->postJson('/api/account/delete-reauth', [
            'email' => 'oauth@example.com',
            'provider' => 'google',
        ])->assertUnauthorized();
    }

    public function test_status_requires_authentication(): void
    {
        $this->getJson('/api/account/delete-reauth/'.str_repeat('a', 64).'/status')
            ->assertUnauthorized();
    }

    public function test_start_rejects_account_with_local_password(): void
    {
        Socialite::shouldReceive('driver')->never();

        $user = User::factory()->create([
            'email' => 'oauth@example.com',
            'password' => 'local-password-hash',
        ]);

        $token = $user->createToken('delete-reauth-test');

        $user->oauthIdentities()->create([
            'provider' => 'google',
            'provider_user_id' => 'google-user-123',
            'provider_email' => 'oauth@example.com',
            'avatar_url' => null,
        ]);

        $this->postJson('/api/account/delete-reauth', [
            'email' => 'oauth@example.com',
            'provider' => 'google',
        ], [
            'Authorization' => 'Bearer '.$token->plainTextToken,
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['provider']);
    }

    public function test_start_requires_authenticated_users_exact_email(): void
    {
        Socialite::shouldReceive('driver')->never();

        $user = $this->createOauthOnlyUser();
        $token = $user->createToken('delete-reauth-test');

        $this->postJson('/api/account/delete-reauth', [
            'email' => 'other@example.com',
            'provider' => 'google',
        ], [
            'Authorization' => 'Bearer '.$token->plainTextToken,
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_start_rejects_provider_not_connected_to_authenticated_user(): void
    {
        Socialite::shouldReceive('driver')->never();

        $user = $this->createOauthOnlyUser();
        $token = $user->createToken('delete-reauth-test');
        $headers = [
            'Authorization' => 'Bearer '.$token->plainTextToken,
        ];

        $this->postJson('/api/account/delete-reauth', [
            'email' => 'oauth@example.com',
            'provider' => 'github',
        ], $headers)->assertStatus(422)
            ->assertJsonValidationErrors(['provider']);

        $this->postJson('/api/account/delete-reauth', [
            'email' => 'oauth@example.com',
            'provider' => 'facebook',
        ], $headers)->assertStatus(422)
            ->assertJsonValidationErrors(['provider']);
    }

    public function test_start_rejects_authentication_without_persistent_token_id(): void
    {
        Socialite::shouldReceive('driver')->never();

        $user = $this->createOauthOnlyUser();

        Sanctum::actingAs($user);

        $this->postJson('/api/account/delete-reauth', [
            'email' => 'oauth@example.com',
            'provider' => 'google',
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['reauth']);
    }

    public function test_oauth_only_user_can_start_connected_google_reauth_challenge(): void
    {
        Carbon::setTestNow(Carbon::parse('2035-01-01T00:00:00Z'));

        $user = $this->createOauthOnlyUser();
        $token = $user->createToken('delete-reauth-test');
        $headers = [
            'Authorization' => 'Bearer '.$token->plainTextToken,
        ];

        $capturedState = null;
        $driver = Mockery::mock();

        Socialite::shouldReceive('driver')
            ->once()
            ->with('google')
            ->andReturn($driver);

        $driver->shouldReceive('stateless')
            ->once()
            ->andReturnSelf();

        $driver->shouldReceive('redirectUrl')
            ->once()
            ->with(route('delete-reauth.google.callback'))
            ->andReturnSelf();

        $driver->shouldReceive('with')
            ->once()
            ->with(Mockery::on(function (array $parameters) use (&$capturedState) {
                $capturedState = $parameters['state'] ?? null;

                return is_string($capturedState)
                    && preg_match('/^[a-f0-9]{64}$/', $capturedState) === 1;
            }))
            ->andReturnSelf();

        $driver->shouldReceive('redirect')
            ->once()
            ->andReturn(
                new RedirectResponse(
                    'https://accounts.example.test/oauth/authorize?state=opaque',
                ),
            );

        $response = $this->postJson('/api/account/delete-reauth', [
            'email' => ' OAUTH@EXAMPLE.COM ',
            'provider' => 'google',
        ], $headers);

        $response->assertOk();

        $this->assertSame(
            ['challenge', 'authorization_url', 'expires_at'],
            array_keys($response->json()),
        );
        $this->assertMatchesRegularExpression('/^[a-f0-9]{64}$/', $response->json('challenge'));
        $this->assertSame(
            'https://accounts.example.test/oauth/authorize?state=opaque',
            $response->json('authorization_url'),
        );
        $this->assertSame('2035-01-01T00:10:00Z', $response->json('expires_at'));
        $this->assertNotNull($capturedState);

        $this->getJson(
            '/api/account/delete-reauth/'.$response->json('challenge').'/status',
            $headers,
        )->assertExactJson([
            'status' => 'pending',
        ]);
    }

    public function test_status_returns_invalid_for_different_current_token(): void
    {
        Carbon::setTestNow(Carbon::parse('2035-01-01T00:10:00Z'));

        $user = $this->createOauthOnlyUser();
        $firstToken = $user->createToken('delete-reauth-first');
        $secondToken = $user->createToken('delete-reauth-second');

        $this->assertNotSame(
            (int) $firstToken->accessToken->getKey(),
            (int) $secondToken->accessToken->getKey(),
        );

        $issued = app(AccountDeleteReauthService::class)->issue(
            userId: (int) $user->id,
            accessTokenId: (int) $firstToken->accessToken->getKey(),
            provider: 'google',
            providerUserId: 'google-user-123',
        );

        $this->getJson(
            '/api/account/delete-reauth/'.$issued['challenge'].'/status',
            [
                'Authorization' => 'Bearer '.$firstToken->plainTextToken,
            ],
        )->assertOk()
            ->assertExactJson([
                'status' => 'pending',
            ]);

        Auth::forgetGuards();

        $this->getJson(
            '/api/account/delete-reauth/'.$issued['challenge'].'/status',
            [
                'Authorization' => 'Bearer '.$secondToken->plainTextToken,
            ],
        )->assertOk()
            ->assertExactJson([
                'status' => 'invalid',
            ]);
    }

    public function test_status_returns_safe_invalid_for_unknown_or_malformed_challenge(): void
    {
        $user = $this->createOauthOnlyUser();
        $token = $user->createToken('delete-reauth-test');
        $headers = [
            'Authorization' => 'Bearer '.$token->plainTextToken,
        ];

        $this->getJson('/api/account/delete-reauth/not-a-real-challenge/status', $headers)
            ->assertOk()
            ->assertExactJson([
                'status' => 'invalid',
            ]);

        $this->getJson('/api/account/delete-reauth/'.str_repeat('c', 64).'/status', $headers)
            ->assertOk()
            ->assertExactJson([
                'status' => 'invalid',
            ]);
    }

    private function createOauthOnlyUser(): User
    {
        $user = User::factory()->create([
            'email' => 'oauth@example.com',
            'password' => null,
        ]);

        $user->oauthIdentities()->create([
            'provider' => 'google',
            'provider_user_id' => 'google-user-123',
            'provider_email' => 'oauth@example.com',
            'avatar_url' => null,
        ]);

        return $user;
    }
}

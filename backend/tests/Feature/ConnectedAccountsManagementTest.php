<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\OAuthAccountService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Cache;
use Laravel\Socialite\Facades\Socialite;
use Mockery;
use Tests\TestCase;

class ConnectedAccountsManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config(['cache.default' => 'file']);
        app('cache')->setDefaultDriver('file');
        Cache::store('file')->flush();
    }

    protected function tearDown(): void
    {
        Cache::store('file')->flush();
        Mockery::close();

        parent::tearDown();
    }

    public function test_authenticated_user_can_link_google(): void
    {
        $user = $this->createUserWithPassword();
        $state = null;
        $this->mockProviderLinkFlow('google', $this->googleProfile('google-link-1'), $state);

        $this->completeProviderLink($user, 'google', $state);

        $this->assertDatabaseHas('oauth_identities', [
            'user_id' => $user->id,
            'provider' => 'google',
            'provider_user_id' => 'google-link-1',
        ]);
    }

    public function test_authenticated_user_can_link_github(): void
    {
        $user = $this->createUserWithPassword();
        $state = null;
        $this->mockProviderLinkFlow('github', $this->githubProfile('github-link-1'), $state);

        $this->completeProviderLink($user, 'github', $state);

        $this->assertDatabaseHas('oauth_identities', [
            'user_id' => $user->id,
            'provider' => 'github',
            'provider_user_id' => 'github-link-1',
        ]);
    }

    public function test_cannot_link_provider_identity_owned_by_another_user(): void
    {
        $user = $this->createUserWithPassword();
        $owner = $this->createUserWithPassword('owner@example.com');
        $owner->oauthIdentities()->create([
            'provider' => 'google',
            'provider_user_id' => 'already-owned-google-id',
            'provider_email' => 'owner-provider@example.com',
        ]);

        $state = null;
        $this->mockProviderLinkFlow(
            'google',
            $this->googleProfile('already-owned-google-id', 'target@example.com'),
            $state,
        );

        $response = $this->startProviderLink($user, 'google');

        $this->get('/auth/oauth/google/callback?'.http_build_query(['state' => $state]))
            ->assertRedirectContains('oauth_link=failed')
            ->assertRedirectContains('oauth_link_conflict');

        $response->assertOk();
        $this->assertDatabaseMissing('oauth_identities', [
            'user_id' => $user->id,
            'provider' => 'google',
        ]);
        $this->assertDatabaseHas('oauth_identities', [
            'user_id' => $owner->id,
            'provider' => 'google',
            'provider_user_id' => 'already-owned-google-id',
        ]);
    }

    public function test_provider_can_be_unlinked_when_another_login_method_exists(): void
    {
        $user = $this->createUserWithPassword();
        $user->oauthIdentities()->create([
            'provider' => 'google',
            'provider_user_id' => 'google-unlink-local',
        ]);

        $this->unlinkProvider($user, 'google')
            ->assertOk()
            ->assertJsonPath('user.has_local_password', true)
            ->assertJsonPath('user.connected_providers', []);

        $this->assertDatabaseMissing('oauth_identities', [
            'user_id' => $user->id,
            'provider' => 'google',
        ]);
    }

    public function test_cannot_unlink_last_oauth_login_method(): void
    {
        $user = $this->createOauthOnlyUser();
        $user->oauthIdentities()->create([
            'provider' => 'google',
            'provider_user_id' => 'google-last-login',
        ]);

        $this->unlinkProvider($user, 'google')
            ->assertStatus(422)
            ->assertJsonPath(
                'message',
                'Cannot disconnect the last login method. Add a local password or another connected provider first.',
            );

        $this->assertDatabaseHas('oauth_identities', [
            'user_id' => $user->id,
            'provider' => 'google',
            'provider_user_id' => 'google-last-login',
        ]);
    }

    public function test_local_password_and_provider_can_unlink_provider(): void
    {
        $user = $this->createUserWithPassword();
        $user->oauthIdentities()->create([
            'provider' => 'github',
            'provider_user_id' => 'github-unlink-local',
        ]);

        $this->unlinkProvider($user, 'github')->assertOk();

        $this->assertDatabaseMissing('oauth_identities', [
            'user_id' => $user->id,
            'provider' => 'github',
        ]);
    }

    public function test_oauth_user_can_unlink_one_of_two_providers(): void
    {
        $user = $this->createOauthOnlyUser();
        $user->oauthIdentities()->createMany([
            ['provider' => 'google', 'provider_user_id' => 'google-two-providers'],
            ['provider' => 'github', 'provider_user_id' => 'github-two-providers'],
        ]);

        $this->unlinkProvider($user, 'github')
            ->assertOk()
            ->assertJsonPath('user.connected_providers', ['google']);

        $this->assertDatabaseHas('oauth_identities', [
            'user_id' => $user->id,
            'provider' => 'google',
            'provider_user_id' => 'google-two-providers',
        ]);
        $this->assertDatabaseMissing('oauth_identities', [
            'user_id' => $user->id,
            'provider' => 'github',
        ]);
    }

    public function test_unlink_does_not_change_another_users_identities(): void
    {
        $user = $this->createUserWithPassword();
        $user->oauthIdentities()->create([
            'provider' => 'google',
            'provider_user_id' => 'google-own-identity',
        ]);

        $otherUser = $this->createOauthOnlyUser('other@example.com');
        $otherIdentity = $otherUser->oauthIdentities()->create([
            'provider' => 'github',
            'provider_user_id' => 'github-other-identity',
            'provider_email' => 'other-provider@example.com',
        ]);

        $this->unlinkProvider($user, 'google')->assertOk();

        $this->assertDatabaseHas('oauth_identities', [
            'id' => $otherIdentity->id,
            'user_id' => $otherUser->id,
            'provider' => 'github',
            'provider_user_id' => 'github-other-identity',
            'provider_email' => 'other-provider@example.com',
        ]);
    }

    public function test_duplicate_link_of_the_same_identity_is_idempotent(): void
    {
        $user = $this->createUserWithPassword();
        $service = app(OAuthAccountService::class);

        $service->linkIdentity($user, 'google', 'google-idempotent', 'g@example.com', true);
        $service->linkIdentity($user, 'google', 'google-idempotent', 'g@example.com', true);

        $this->assertDatabaseCount('oauth_identities', 1);
    }

    public function test_link_state_cannot_be_replayed(): void
    {
        $user = $this->createUserWithPassword();
        $state = null;
        $this->mockProviderLinkFlow('google', $this->googleProfile('google-replay'), $state);
        $this->startProviderLink($user, 'google')->assertOk();

        $callback = '/auth/oauth/google/callback?'.http_build_query(['state' => $state]);
        $this->get($callback)->assertRedirectContains('oauth_link=success');
        $this->get($callback)
            ->assertRedirectContains('oauth_link=failed')
            ->assertRedirectContains('oauth_state_invalid');
    }

    public function test_normal_google_oauth_login_still_issues_and_exchanges_a_login_code(): void
    {
        $user = $this->createOauthOnlyUser();
        $user->oauthIdentities()->create([
            'provider' => 'google',
            'provider_user_id' => 'google-login-regression',
            'provider_email' => 'oauth@example.com',
        ]);
        $driver = Mockery::mock();
        $driver->shouldReceive('user')
            ->once()
            ->andReturn($this->googleProfile('google-login-regression'));

        Socialite::shouldReceive('driver')
            ->once()
            ->with('google')
            ->andReturn($driver);

        $callbackResponse = $this->get('/auth/oauth/google/callback');
        $callbackResponse->assertRedirectContains('/auth/oauth/callback?code=');

        parse_str(
            (string) parse_url((string) $callbackResponse->headers->get('Location'), PHP_URL_QUERY),
            $query,
        );

        $this->postJson('/api/auth/oauth/exchange', [
            'code' => $query['code'] ?? '',
        ])
            ->assertOk()
            ->assertJsonPath('user.id', $user->id);

        $this->assertDatabaseCount('oauth_identities', 1);
    }

    public function test_normal_github_oauth_login_still_issues_and_exchanges_a_login_code(): void
    {
        $user = $this->createOauthOnlyUser();
        $user->oauthIdentities()->create([
            'provider' => 'github',
            'provider_user_id' => 'github-login-regression',
            'provider_email' => 'oauth@example.com',
        ]);
        $driver = Mockery::mock();
        $driver->shouldReceive('user')
            ->once()
            ->andReturn($this->githubProfile('github-login-regression'));

        Socialite::shouldReceive('driver')
            ->once()
            ->with('github')
            ->andReturn($driver);

        $callbackResponse = $this->get('/auth/oauth/github/callback');
        $callbackResponse->assertRedirectContains('/auth/oauth/callback?code=');

        parse_str(
            (string) parse_url((string) $callbackResponse->headers->get('Location'), PHP_URL_QUERY),
            $query,
        );

        $this->postJson('/api/auth/oauth/exchange', [
            'code' => $query['code'] ?? '',
        ])
            ->assertOk()
            ->assertJsonPath('user.id', $user->id);

        $this->assertDatabaseCount('oauth_identities', 1);
    }

    private function mockProviderLinkFlow(
        string $provider,
        object $providerUser,
        ?string &$state,
    ): void {
        $driver = Mockery::mock();

        Socialite::shouldReceive('driver')
            ->twice()
            ->with($provider)
            ->andReturn($driver);

        $driver->shouldReceive('stateless')
            ->twice()
            ->andReturnSelf();

        if ($provider === 'github') {
            $driver->shouldReceive('scopes')
                ->once()
                ->with(['user:email'])
                ->andReturnSelf();
        }

        $driver->shouldReceive('with')
            ->once()
            ->with(Mockery::on(function (array $parameters) use (&$state): bool {
                $state = $parameters['state'] ?? null;

                return is_string($state)
                    && preg_match('/\Aoauth-link-v1-[a-f0-9]{64}\z/', $state) === 1;
            }))
            ->andReturnSelf();

        $driver->shouldReceive('redirect')
            ->once()
            ->andReturn(new RedirectResponse('https://provider.example.test/authorize'));

        $driver->shouldReceive('user')
            ->once()
            ->andReturn($providerUser);
    }

    private function completeProviderLink(
        User $user,
        string $provider,
        ?string &$state,
    ): void {
        $this->startProviderLink($user, $provider)->assertOk();

        $this->get('/auth/oauth/'.$provider.'/callback?'.http_build_query(['state' => $state]))
            ->assertRedirectContains('oauth_link=success')
            ->assertRedirectContains('provider='.$provider);
    }

    private function startProviderLink(User $user, string $provider)
    {
        $token = $user->createToken('connected-accounts-test');

        return $this->withHeader(
            'Authorization',
            'Bearer '.$token->plainTextToken,
        )->postJson('/api/auth/oauth/'.$provider.'/link');
    }

    private function unlinkProvider(User $user, string $provider)
    {
        $token = $user->createToken('connected-accounts-test');

        return $this->withHeader(
            'Authorization',
            'Bearer '.$token->plainTextToken,
        )->deleteJson('/api/auth/oauth/'.$provider.'/link');
    }

    private function createUserWithPassword(string $email = 'user@example.com'): User
    {
        return User::factory()->create([
            'email' => $email,
            'password' => bcrypt('test-password'),
        ]);
    }

    private function createOauthOnlyUser(string $email = 'oauth@example.com'): User
    {
        return User::factory()->create([
            'email' => $email,
            'password' => null,
        ]);
    }

    private function googleProfile(
        string $providerUserId,
        string $email = 'oauth@example.com',
    ): object {
        return new class($providerUserId, $email)
        {
            public array $user = ['verified_email' => true];

            public function __construct(
                private readonly string $providerUserId,
                private readonly string $email,
            ) {}

            public function getId(): string
            {
                return $this->providerUserId;
            }

            public function getEmail(): string
            {
                return $this->email;
            }

            public function getName(): string
            {
                return 'OAuth Test User';
            }

            public function getAvatar(): string
            {
                return 'https://provider.example.test/avatar.png';
            }
        };
    }

    private function githubProfile(
        string $providerUserId,
        string $email = 'oauth@example.com',
    ): object {
        return new class($providerUserId, $email)
        {
            public function __construct(
                private readonly string $providerUserId,
                private readonly string $email,
            ) {}

            public function getId(): string
            {
                return $this->providerUserId;
            }

            public function getEmail(): string
            {
                return $this->email;
            }

            public function getName(): string
            {
                return 'OAuth Test User';
            }

            public function getNickname(): string
            {
                return 'oauth-test-user';
            }

            public function getAvatar(): string
            {
                return 'https://provider.example.test/avatar.png';
            }
        };
    }
}

<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Laravel\Socialite\Facades\Socialite;
use Mockery;
use Tests\TestCase;

class OAuthLoginTest extends TestCase
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

    public function test_google_login_issues_and_exchanges_a_login_code(): void
    {
        $user = $this->createOAuthUser('google');
        $driver = Mockery::mock();
        $driver->shouldReceive('user')
            ->once()
            ->andReturn($this->googleProfile('google-login'));

        Socialite::shouldReceive('driver')
            ->once()
            ->with('google')
            ->andReturn($driver);

        $this->assertProviderLoginCompletes('google', $user);
    }

    public function test_github_login_issues_and_exchanges_a_login_code(): void
    {
        $user = $this->createOAuthUser('github');
        $driver = Mockery::mock();
        $driver->shouldReceive('user')
            ->once()
            ->andReturn($this->githubProfile('github-login'));

        Socialite::shouldReceive('driver')
            ->once()
            ->with('github')
            ->andReturn($driver);

        $this->assertProviderLoginCompletes('github', $user);
    }

    public function test_oauth_exchange_code_can_only_be_consumed_once(): void
    {
        $user = $this->createOAuthUser('google', 'google-single-use');
        $driver = Mockery::mock();
        $driver->shouldReceive('user')
            ->once()
            ->andReturn($this->googleProfile('google-single-use'));

        Socialite::shouldReceive('driver')
            ->once()
            ->with('google')
            ->andReturn($driver);

        $callback = $this->get('/auth/oauth/google/callback');
        $callback->assertRedirectContains('/auth/oauth/callback?code=');

        parse_str(
            (string) parse_url((string) $callback->headers->get('Location'), PHP_URL_QUERY),
            $query,
        );

        $code = $query['code'] ?? '';
        $this->postJson('/api/auth/oauth/exchange', ['code' => $code])
            ->assertOk()
            ->assertJsonPath('user.id', $user->id);

        $this->assertDatabaseCount('devices', 1);

        $this->postJson('/api/auth/oauth/exchange', ['code' => $code])
            ->assertUnprocessable();
    }

    private function assertProviderLoginCompletes(string $provider, User $user): void
    {
        $callback = $this->get('/auth/oauth/'.$provider.'/callback');
        $callback->assertRedirectContains('/auth/oauth/callback?code=');

        parse_str(
            (string) parse_url((string) $callback->headers->get('Location'), PHP_URL_QUERY),
            $query,
        );

        $this->postJson('/api/auth/oauth/exchange', [
            'code' => $query['code'] ?? '',
        ])
            ->assertOk()
            ->assertJsonPath('user.id', $user->id)
            ->assertJsonStructure(['message', 'token', 'user']);

        $this->assertDatabaseCount('oauth_identities', 1);
    }

    private function createOAuthUser(
        string $provider,
        ?string $providerUserId = null,
    ): User {
        $user = User::factory()->create([
            'email' => 'oauth@example.com',
            'password' => null,
        ]);
        $user->oauthIdentities()->create([
            'provider' => $provider,
            'provider_user_id' => $providerUserId ?? $provider.'-login',
            'provider_email' => 'oauth@example.com',
        ]);

        return $user;
    }

    private function googleProfile(string $providerUserId): object
    {
        return new class($providerUserId)
        {
            public array $user = ['verified_email' => true];

            public function __construct(private readonly string $providerUserId) {}

            public function getId(): string
            {
                return $this->providerUserId;
            }

            public function getEmail(): string
            {
                return 'oauth@example.com';
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

    private function githubProfile(string $providerUserId): object
    {
        return new class($providerUserId)
        {
            public function __construct(private readonly string $providerUserId) {}

            public function getId(): string
            {
                return $this->providerUserId;
            }

            public function getEmail(): string
            {
                return 'oauth@example.com';
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

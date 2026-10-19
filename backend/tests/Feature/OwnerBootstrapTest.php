<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Laravel\Socialite\Facades\Socialite;
use Mockery;
use Tests\TestCase;

class OwnerBootstrapTest extends TestCase
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

    public function test_first_owner_can_be_created_with_a_hashed_local_password(): void
    {
        $this->runOwnerCommand();

        $owner = User::query()->where('email', 'owner@example.com')->firstOrFail();

        $this->assertSame(User::ROLE_OWNER, $owner->role);
        $this->assertTrue($owner->isAdmin());
        $this->assertSame('primary', $owner->owner_key);
        $this->assertTrue(Hash::check('strong-password-123', $owner->password));
        $this->assertDatabaseCount('oauth_identities', 0);
    }

    public function test_owner_bootstrap_refuses_to_create_a_second_owner(): void
    {
        User::factory()->create([
            'email' => 'existing-owner@example.com',
            'role' => User::ROLE_OWNER,
            'owner_key' => 'primary',
        ]);

        $this->artisan('cenimbox:create-owner')
            ->expectsOutputToContain('A CenimBox Owner already exists.')
            ->assertExitCode(1);

        $this->assertDatabaseCount('users', 1);
    }

    public function test_owner_bootstrap_rejects_an_existing_email(): void
    {
        User::factory()->create(['email' => 'owner@example.com']);

        $this->artisan('cenimbox:create-owner')
            ->expectsQuestion('Name', 'First Owner')
            ->expectsQuestion('Email', 'owner@example.com')
            ->expectsQuestion('Password', 'strong-password-123')
            ->expectsQuestion('Confirm password', 'strong-password-123')
            ->expectsOutputToContain('The email has already been taken.')
            ->assertExitCode(1);

        $this->assertDatabaseCount('users', 1);
    }

    public function test_owner_can_log_in_with_email_and_password(): void
    {
        $this->runOwnerCommand();

        $this->postJson('/api/auth/login', [
            'email' => 'owner@example.com',
            'password' => 'strong-password-123',
        ])
            ->assertOk()
            ->assertJsonPath('user.role', User::ROLE_OWNER);
    }

    public function test_normal_users_do_not_receive_owner_or_admin_privileges(): void
    {
        $user = User::factory()->create(['role' => User::ROLE_USER]);

        $this->assertFalse($user->isAdmin());
        $this->assertSame(User::ROLE_USER, $user->role);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/admin/users')
            ->assertForbidden();
    }

    public function test_owner_can_initiate_google_linking(): void
    {
        $owner = User::factory()->create([
            'email' => 'owner@example.com',
            'role' => User::ROLE_OWNER,
            'owner_key' => 'primary',
        ]);
        $driver = Mockery::mock();
        $driver->shouldReceive('stateless')->once()->andReturnSelf();
        $driver->shouldReceive('with')
            ->once()
            ->with(Mockery::on(fn (array $params): bool => isset($params['state'])))
            ->andReturnSelf();
        $driver->shouldReceive('redirect')
            ->once()
            ->andReturn(new RedirectResponse('https://provider.example.test/authorize'));
        Socialite::shouldReceive('driver')->once()->with('google')->andReturn($driver);

        $this->actingAs($owner, 'sanctum')
            ->postJson('/api/auth/oauth/google/link')
            ->assertOk()
            ->assertJsonPath('authorization_url', 'https://provider.example.test/authorize');
    }

    public function test_owner_can_initiate_github_linking(): void
    {
        $owner = User::factory()->create([
            'email' => 'owner@example.com',
            'role' => User::ROLE_OWNER,
            'owner_key' => 'primary',
        ]);
        $driver = Mockery::mock();
        $driver->shouldReceive('stateless')->once()->andReturnSelf();
        $driver->shouldReceive('scopes')->once()->with(['user:email'])->andReturnSelf();
        $driver->shouldReceive('with')
            ->once()
            ->with(Mockery::on(fn (array $params): bool => isset($params['state'])))
            ->andReturnSelf();
        $driver->shouldReceive('redirect')
            ->once()
            ->andReturn(new RedirectResponse('https://provider.example.test/authorize'));
        Socialite::shouldReceive('driver')->once()->with('github')->andReturn($driver);

        $this->actingAs($owner, 'sanctum')
            ->postJson('/api/auth/oauth/github/link')
            ->assertOk()
            ->assertJsonPath('authorization_url', 'https://provider.example.test/authorize');
    }

    public function test_public_registration_is_rejected_when_disabled(): void
    {
        config(['registration.allow_public_registration' => false]);

        $this->postJson('/api/auth/register', $this->registrationPayload())
            ->assertForbidden()
            ->assertJsonPath('message', 'Public registration is disabled.');

        $this->assertDatabaseCount('users', 0);
    }

    public function test_public_registration_remains_available_when_enabled_and_creates_a_normal_user(): void
    {
        config(['registration.allow_public_registration' => true]);

        $this->postJson('/api/auth/register', $this->registrationPayload())
            ->assertCreated()
            ->assertJsonPath('user.role', User::ROLE_USER);

        $this->assertDatabaseHas('users', [
            'email' => 'new-user@example.com',
            'role' => User::ROLE_USER,
        ]);
    }

    public function test_database_seeder_does_not_create_default_accounts(): void
    {
        $this->seed();

        $this->assertDatabaseCount('users', 0);
    }

    private function runOwnerCommand()
    {
        return $this->artisan('cenimbox:create-owner')
            ->expectsQuestion('Name', 'First Owner')
            ->expectsQuestion('Email', 'owner@example.com')
            ->expectsQuestion('Password', 'strong-password-123')
            ->expectsQuestion('Confirm password', 'strong-password-123')
            ->expectsOutputToContain('CenimBox Owner account created successfully.')
            ->assertExitCode(0);
    }

    private function registrationPayload(): array
    {
        return [
            'name' => 'Normal User',
            'email' => 'new-user@example.com',
            'password' => 'strong-password-123',
            'password_confirmation' => 'strong-password-123',
        ];
    }
}

<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AdminUserCreationTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_create_a_normal_user_with_local_login(): void
    {
        config(['registration.allow_public_registration' => false]);
        $owner = $this->makeUser(User::ROLE_OWNER);

        $response = $this->actingAs($owner, 'sanctum')
            ->postJson('/api/admin/users', $this->validPayload());

        $response->assertCreated()
            ->assertJsonPath('user.role', User::ROLE_USER)
            ->assertJsonMissingPath('user.password')
            ->assertJsonMissingPath('user.owner_key');

        $user = User::query()->where('email', 'new-user@example.com')->firstOrFail();
        $this->assertSame(User::ROLE_USER, $user->role);
        $this->assertNull($user->owner_key);
        $this->assertTrue(Hash::check('temporary-password-123', $user->password));
        $this->assertDatabaseCount('oauth_identities', 0);
        $this->assertDatabaseCount('gdrive_accounts', 0);

        $this->postJson('/api/auth/login', [
            'email' => 'new-user@example.com',
            'password' => 'temporary-password-123',
        ])
            ->assertOk()
            ->assertJsonPath('user.role', User::ROLE_USER);
    }

    public function test_admin_role_can_create_a_normal_user(): void
    {
        $admin = $this->makeUser(User::ROLE_ADMIN);

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/users', $this->validPayload())
            ->assertCreated()
            ->assertJsonPath('user.role', User::ROLE_USER);
    }

    public function test_normal_user_cannot_create_users(): void
    {
        $user = $this->makeUser(User::ROLE_USER);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/admin/users', $this->validPayload())
            ->assertForbidden();

        $this->assertDatabaseCount('users', 1);
    }

    public function test_duplicate_email_is_rejected(): void
    {
        $admin = $this->makeUser(User::ROLE_OWNER);
        $this->makeUser(User::ROLE_USER, 'new-user@example.com');

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/users', $this->validPayload())
            ->assertUnprocessable()
            ->assertJsonValidationErrors('email');

        $this->assertDatabaseCount('users', 2);
    }

    public function test_short_password_is_rejected(): void
    {
        $admin = $this->makeUser(User::ROLE_OWNER);

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/users', $this->validPayload([
                'password' => 'short',
                'password_confirmation' => 'short',
            ]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('password');

        $this->assertDatabaseCount('users', 1);
    }

    public function test_submitted_owner_or_admin_role_is_rejected(): void
    {
        $admin = $this->makeUser(User::ROLE_OWNER);

        foreach ([User::ROLE_OWNER, User::ROLE_ADMIN, null] as $role) {
            $this->actingAs($admin, 'sanctum')
                ->postJson('/api/admin/users', $this->validPayload(['role' => $role]))
                ->assertUnprocessable()
                ->assertJsonValidationErrors('role');
        }

        $this->assertDatabaseCount('users', 1);
    }

    public function test_owner_key_cannot_be_supplied_by_client(): void
    {
        $admin = $this->makeUser(User::ROLE_OWNER);

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/users', $this->validPayload([
                'owner_key' => 'primary',
            ]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('owner_key');

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/users', $this->validPayload([
                'owner_key' => null,
            ]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('owner_key');

        $this->assertDatabaseCount('users', 1);
    }

    public function test_other_users_remain_unchanged_when_creating_an_account(): void
    {
        $owner = $this->makeUser(User::ROLE_OWNER, 'owner@example.com');
        $existing = $this->makeUser(User::ROLE_USER, 'existing@example.com');
        $existingAttributes = $existing->only(['name', 'email', 'role', 'password']);

        $this->actingAs($owner, 'sanctum')
            ->postJson('/api/admin/users', $this->validPayload())
            ->assertCreated();

        $this->assertSame(
            $existingAttributes,
            $existing->fresh()->only(['name', 'email', 'role', 'password']),
        );
        $this->assertDatabaseCount('users', 3);
    }

    private function makeUser(string $role, string $email = 'admin@example.com'): User
    {
        return User::factory()->create([
            'email' => $email,
            'role' => $role,
        ]);
    }

    private function validPayload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'New User',
            'email' => 'new-user@example.com',
            'password' => 'temporary-password-123',
            'password_confirmation' => 'temporary-password-123',
        ], $overrides);
    }
}

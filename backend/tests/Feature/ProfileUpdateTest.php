<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ProfileUpdateTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_update_profile_name(): void
    {
        $user = User::factory()->create(['name' => 'Original Name']);

        $response = $this->actingAs($user, 'sanctum')->patchJson('/api/profile', [
            'name' => 'Updated Name',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Profile updated successfully.',
                'user' => [
                    'id' => $user->id,
                    'name' => 'Updated Name',
                    'email' => $user->email,
                ],
            ]);

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'name' => 'Updated Name',
        ]);
    }

    public function test_profile_update_requires_a_valid_name(): void
    {
        $user = User::factory()->create(['name' => 'Original Name']);

        $response = $this->actingAs($user, 'sanctum')->patchJson('/api/profile', [
            'name' => ' ',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name']);
    }

    public function test_unauthenticated_user_cannot_update_profile(): void
    {
        $response = $this->patchJson('/api/profile', [
            'name' => 'Updated Name',
        ]);

        $response->assertStatus(401);
    }

    public function test_name_is_trimmed_before_persistence(): void
    {
        $user = User::factory()->create(['name' => 'Original Name']);

        $response = $this->actingAs($user, 'sanctum')->patchJson('/api/profile', [
            'name' => '   Updated Trimmed Name   ',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('user.name', 'Updated Trimmed Name');

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'name' => 'Updated Trimmed Name',
        ]);
    }

    public function test_name_min_length_validation(): void
    {
        $user = User::factory()->create(['name' => 'Original Name']);

        $response = $this->actingAs($user, 'sanctum')->patchJson('/api/profile', [
            'name' => 'A',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name']);
    }

    public function test_name_max_length_validation(): void
    {
        $user = User::factory()->create(['name' => 'Original Name']);

        $long = str_repeat('a', 256);

        $response = $this->actingAs($user, 'sanctum')->patchJson('/api/profile', [
            'name' => $long,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name']);
    }

    public function test_cannot_update_role_via_profile_endpoint(): void
    {
        $user = User::factory()->create(['name' => 'Original Name', 'role' => 'user']);

        $response = $this->actingAs($user, 'sanctum')->patchJson('/api/profile', [
            'name' => 'New Name',
            'role' => 'admin',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('user.role', 'user');

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'name' => 'New Name',
            'role' => 'user',
        ]);
    }

    public function test_cannot_update_email_via_profile_endpoint(): void
    {
        $user = User::factory()->create(['name' => 'Original Name', 'email' => 'orig@example.com']);

        $response = $this->actingAs($user, 'sanctum')->patchJson('/api/profile', [
            'name' => 'Another Name',
            'email' => 'hacker@example.com',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('user.email', 'orig@example.com');

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'name' => 'Another Name',
            'email' => 'orig@example.com',
        ]);
    }

    public function test_password_is_not_changed_via_profile_endpoint(): void
    {
        $originalHash = Hash::make('original-password');
        $user = User::factory()->create([
            'name' => 'Original Name',
            'password' => $originalHash,
            'email' => 'orig-pass@example.com',
        ]);

        $response = $this->actingAs($user, 'sanctum')->patchJson('/api/profile', [
            'name' => 'Safe Name',
            'password' => 'new-password',
        ]);

        $response->assertStatus(200);

        // response must not expose password
        $this->assertArrayNotHasKey('password', $response->json('user'));

        // name updated, password hash unchanged
        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'name' => 'Safe Name',
        ]);

        $fresh = User::find($user->id);
        $this->assertSame($originalHash, $fresh->password);
    }

    public function test_updating_one_user_does_not_modify_another_user(): void
    {
        $hashA = Hash::make('password-a');
        $hashB = Hash::make('password-b');

        $userA = User::factory()->create([
            'name' => 'User A',
            'email' => 'a@example.com',
            'password' => $hashA,
            'role' => 'user',
        ]);

        $userB = User::factory()->create([
            'name' => 'User B',
            'email' => 'b@example.com',
            'password' => $hashB,
            'role' => 'user',
        ]);

        $response = $this->actingAs($userA, 'sanctum')->patchJson('/api/profile', [
            'name' => 'User A Updated',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('user.id', $userA->id)
            ->assertJsonPath('user.name', 'User A Updated');

        // user A updated
        $this->assertDatabaseHas('users', [
            'id' => $userA->id,
            'name' => 'User A Updated',
        ]);

        // user B unchanged
        $this->assertDatabaseHas('users', [
            'id' => $userB->id,
            'name' => 'User B',
            'email' => 'b@example.com',
            'role' => 'user',
        ]);

        $freshB = User::find($userB->id);
        $this->assertSame($hashB, $freshB->password);
    }
}

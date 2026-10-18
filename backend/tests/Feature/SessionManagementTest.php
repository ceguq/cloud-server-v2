<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SessionManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_sessions_lists_only_the_authenticated_users_tokens_and_marks_current_session(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        $currentToken = $user->createToken('current-session');
        $otherToken = $user->createToken('another-session');
        $foreignToken = $otherUser->createToken('foreign-session');

        $response = $this->withToken($currentToken->plainTextToken)
            ->getJson('/api/sessions');

        $response->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonFragment([
                'id' => (string) $currentToken->accessToken->getKey(),
                'name' => 'current-session',
                'is_current' => true,
            ])
            ->assertJsonFragment([
                'id' => (string) $otherToken->accessToken->getKey(),
                'name' => 'another-session',
                'is_current' => false,
            ])
            ->assertJsonMissing([
                'id' => (string) $foreignToken->accessToken->getKey(),
            ]);
    }

    public function test_user_can_revoke_one_of_their_sessions(): void
    {
        $user = User::factory()->create();
        $currentToken = $user->createToken('current-session');
        $targetToken = $user->createToken('target-session');

        $response = $this->withToken($currentToken->plainTextToken)
            ->deleteJson('/api/sessions/'.$targetToken->accessToken->getKey());

        $response->assertOk();
        $this->assertDatabaseMissing('personal_access_tokens', [
            'id' => $targetToken->accessToken->getKey(),
        ]);
        $this->assertDatabaseHas('personal_access_tokens', [
            'id' => $currentToken->accessToken->getKey(),
        ]);
    }

    public function test_user_cannot_revoke_another_users_session(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        $currentToken = $user->createToken('current-session');
        $foreignToken = $otherUser->createToken('foreign-session');

        $response = $this->withToken($currentToken->plainTextToken)
            ->deleteJson('/api/sessions/'.$foreignToken->accessToken->getKey());

        $response->assertNotFound();
        $this->assertDatabaseHas('personal_access_tokens', [
            'id' => $foreignToken->accessToken->getKey(),
            'tokenable_id' => $otherUser->getKey(),
        ]);
    }

    public function test_revoke_all_other_sessions_preserves_current_and_other_users_tokens(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        $currentToken = $user->createToken('current-session');
        $otherToken = $user->createToken('another-session');
        $foreignToken = $otherUser->createToken('foreign-session');

        $response = $this->withToken($currentToken->plainTextToken)
            ->deleteJson('/api/sessions');

        $response->assertOk()
            ->assertJson(['revoked_count' => 1]);
        $this->assertDatabaseHas('personal_access_tokens', [
            'id' => $currentToken->accessToken->getKey(),
            'tokenable_id' => $user->getKey(),
        ]);
        $this->assertDatabaseMissing('personal_access_tokens', [
            'id' => $otherToken->accessToken->getKey(),
        ]);
        $this->assertDatabaseHas('personal_access_tokens', [
            'id' => $foreignToken->accessToken->getKey(),
            'tokenable_id' => $otherUser->getKey(),
        ]);
    }

    public function test_normal_logout_still_revokes_only_the_current_session(): void
    {
        $user = User::factory()->create();
        $currentToken = $user->createToken('current-session');
        $otherToken = $user->createToken('another-session');

        $response = $this->withToken($currentToken->plainTextToken)
            ->postJson('/api/auth/logout');

        $response->assertOk();
        $this->assertDatabaseMissing('personal_access_tokens', [
            'id' => $currentToken->accessToken->getKey(),
        ]);
        $this->assertDatabaseHas('personal_access_tokens', [
            'id' => $otherToken->accessToken->getKey(),
            'tokenable_id' => $user->getKey(),
        ]);
    }
}

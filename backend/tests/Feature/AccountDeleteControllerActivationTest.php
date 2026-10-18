<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\AccountDeleteCleanupManifest;
use App\Models\File;
use App\Models\Folder;
use App\Models\User;
use App\Services\AccountDeleteReauthService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

final class AccountDeleteControllerActivationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config(['cache.default' => 'file']);
        app('cache')->setDefaultDriver('file');
        Cache::store('file')->flush();
        Storage::fake('local');
    }

    protected function tearDown(): void
    {
        config(['cache.default' => 'file']);
        app('cache')->setDefaultDriver('file');
        Cache::store('file')->flush();

        parent::tearDown();
    }

    public function test_local_hybrid_and_oauth_only_accounts_can_complete_deletion(): void
    {
        $other = $this->makeUserWithResources('unrelated');
        $otherToken = $other->createToken('unrelated');

        foreach (['local', 'hybrid', 'oauth'] as $accountType) {
            $subject = $this->makeUserWithResources($accountType, $accountType !== 'oauth');
            if ($accountType !== 'local') {
                $subject->oauthIdentities()->create([
                    'provider' => 'google',
                    'provider_user_id' => $accountType.'-provider-id',
                    'provider_email' => $subject->email,
                    'avatar_url' => null,
                ]);
            }
            $token = $subject->createToken($accountType);
            $payload = [
                'email' => $subject->email,
                'confirm_delete' => true,
            ];

            if ($accountType === 'oauth') {
                $reauth = app(AccountDeleteReauthService::class);
                $challenge = $reauth->issue(
                    userId: (int) $subject->getKey(),
                    accessTokenId: (int) $token->accessToken->getKey(),
                    provider: 'google',
                    providerUserId: $accountType.'-provider-id',
                );
                $this->assertTrue($reauth->verify(
                    state: $challenge['state'],
                    provider: 'google',
                    providerUserId: $accountType.'-provider-id',
                ));
                $payload['challenge_id'] = $challenge['challenge'];
            } else {
                $payload['current_password'] = 'valid-password';
            }

            $fileId = File::query()->where('user_id', $subject->getKey())->value('id');
            $folderId = Folder::query()->where('user_id', $subject->getKey())->value('id');
            $subjectId = (int) $subject->getKey();
            $tokenId = (int) $token->accessToken->getKey();

            $response = $this->deleteJson('/api/account', $payload, [
                'Authorization' => 'Bearer '.$token->plainTextToken,
            ]);

            $response->assertOk()->assertExactJson([
                'message' => 'Account deleted successfully.',
            ]);
            $this->assertDatabaseMissing('users', ['id' => $subjectId]);
            $this->assertDatabaseMissing('personal_access_tokens', ['id' => $tokenId]);
            $this->assertDatabaseMissing('files', ['id' => $fileId]);
            $this->assertDatabaseMissing('folders', ['id' => $folderId]);

            $manifest = AccountDeleteCleanupManifest::query()
                ->where('subject_user_id', $subjectId)
                ->sole();
            $this->assertSame('completed', $manifest->status);
            $this->assertNotNull($manifest->completed_at);

            $this->app['auth']->forgetGuards();
            $this->getJson('/api/auth/me', [
                'Authorization' => 'Bearer '.$token->plainTextToken,
            ])->assertUnauthorized();
        }

        $this->assertDatabaseHas('users', ['id' => $other->getKey()]);
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $otherToken->accessToken->getKey()]);
        $this->assertDatabaseHas('files', ['user_id' => $other->getKey()]);
        $this->assertDatabaseHas('folders', ['user_id' => $other->getKey()]);
        $this->app['auth']->forgetGuards();
        $this->getJson('/api/auth/me', [
            'Authorization' => 'Bearer '.$otherToken->plainTextToken,
        ])->assertOk();
    }

    public function test_invalid_password_and_unverified_oauth_challenge_start_no_cleanup(): void
    {
        $local = $this->makeUserWithResources('invalid-local', true);
        $localToken = $local->createToken('invalid-local');
        $this->deleteJson('/api/account', [
            'email' => $local->email,
            'current_password' => 'wrong-password',
            'confirm_delete' => true,
        ], [
            'Authorization' => 'Bearer '.$localToken->plainTextToken,
        ])->assertUnprocessable();

        $oauth = $this->makeUserWithResources('invalid-oauth', false);
        $oauth->oauthIdentities()->create([
            'provider' => 'github',
            'provider_user_id' => 'invalid-oauth-provider-id',
            'provider_email' => $oauth->email,
            'avatar_url' => null,
        ]);
        $oauthToken = $oauth->createToken('invalid-oauth');
        $challenge = app(AccountDeleteReauthService::class)->issue(
            userId: (int) $oauth->getKey(),
            accessTokenId: (int) $oauthToken->accessToken->getKey(),
            provider: 'github',
            providerUserId: 'invalid-oauth-provider-id',
        );
        $this->deleteJson('/api/account', [
            'email' => $oauth->email,
            'challenge_id' => $challenge['challenge'],
            'confirm_delete' => true,
        ], [
            'Authorization' => 'Bearer '.$oauthToken->plainTextToken,
        ])->assertUnprocessable();

        $this->assertDatabaseHas('users', ['id' => $local->getKey()]);
        $this->assertDatabaseHas('users', ['id' => $oauth->getKey()]);
        $this->assertDatabaseHas('files', ['user_id' => $local->getKey()]);
        $this->assertDatabaseHas('files', ['user_id' => $oauth->getKey()]);
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $localToken->accessToken->getKey()]);
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $oauthToken->accessToken->getKey()]);
        $this->assertSame(
            'pending',
            app(AccountDeleteReauthService::class)->status(
                $challenge['challenge'],
                (int) $oauth->getKey(),
                (int) $oauthToken->accessToken->getKey(),
            ),
        );
        $this->assertSame(0, AccountDeleteCleanupManifest::query()->count());
    }

    public function test_cleanup_pending_response_reuses_manifest_and_retries_with_fresh_confirmation(): void
    {
        $subject = $this->makeUserWithResources('retry', true);
        $token = $subject->createToken('retry');
        $file = File::query()->where('user_id', $subject->getKey())->firstOrFail();

        $disk = \Mockery::mock();
        $disk->shouldReceive('exists')->twice()->with($file->path)->andReturn(true, true);
        $disk->shouldReceive('delete')->twice()->with($file->path)->andReturn(false, true);
        Storage::shouldReceive('disk')->twice()->with('local')->andReturn($disk);

        $payload = [
            'email' => $subject->email,
            'current_password' => 'valid-password',
            'confirm_delete' => true,
        ];
        $headers = ['Authorization' => 'Bearer '.$token->plainTextToken];

        $this->deleteJson('/api/account', $payload, $headers)
            ->assertStatus(202)
            ->assertExactJson(['message' => 'Account deletion is still being processed.']);
        $manifest = AccountDeleteCleanupManifest::query()
            ->where('subject_user_id', $subject->getKey())
            ->sole();
        $this->assertSame('cleanup_pending', $manifest->status);
        $this->assertSame('physical_local_files', $manifest->failure_category);
        $this->assertDatabaseHas('users', ['id' => $subject->getKey()]);

        $this->deleteJson('/api/account', $payload, $headers)
            ->assertOk()
            ->assertExactJson(['message' => 'Account deleted successfully.']);
        $manifest->refresh();
        $this->assertSame('completed', $manifest->status);
        $this->assertSame(2, $manifest->attempt_count);
        $this->assertSame(
            1,
            AccountDeleteCleanupManifest::query()
                ->where('subject_user_id', $subject->getKey())
                ->count(),
        );
        $this->assertDatabaseMissing('users', ['id' => $subject->getKey()]);
    }

    private function makeUserWithResources(string $key, bool $withPassword = true): User
    {
        $user = User::factory()->create([
            'email' => $key.'-account-delete@example.com',
            'password' => $withPassword ? Hash::make('valid-password') : null,
        ]);
        $folder = Folder::create([
            'name' => $key.'-folder',
            'parent_id' => null,
            'user_id' => $user->getKey(),
        ]);
        $path = 'nimbusdrive/'.$key.'-file.bin';
        File::create([
            'user_id' => $user->getKey(),
            'folder_id' => $folder->getKey(),
            'original_name' => $key.'-file.bin',
            'stored_name' => $key.'-file.bin',
            'path' => $path,
            'mime_type' => 'application/octet-stream',
            'size' => 4,
        ]);
        Storage::disk('local')->put($path, 'data');

        return $user;
    }
}

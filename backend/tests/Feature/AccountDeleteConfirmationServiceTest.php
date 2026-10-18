<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Services\AccountDeleteConfirmationService;
use App\Services\AccountDeleteReauthService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

final class AccountDeleteConfirmationServiceTest extends TestCase
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

    public function test_local_only_and_hybrid_accounts_confirm_with_the_current_password(): void
    {
        $localUser = User::factory()->create([
            'email' => 'local-delete@example.com',
            'password' => Hash::make('correct-password'),
        ]);
        $hybridUser = User::factory()->create([
            'email' => 'hybrid-delete@example.com',
            'password' => Hash::make('correct-password'),
        ]);
        $hybridUser->oauthIdentities()->create([
            'provider' => 'google',
            'provider_user_id' => 'hybrid-google-user',
            'provider_email' => $hybridUser->email,
            'avatar_url' => null,
        ]);

        $service = app(AccountDeleteConfirmationService::class);

        foreach ([$localUser, $hybridUser] as $user) {
            $this->assertTrue($service->confirm($user, [
                'email' => ' '.strtoupper($user->email).' ',
                'current_password' => 'correct-password',
                'confirm_delete' => true,
            ]));
        }
    }

    public function test_local_and_hybrid_accounts_reject_invalid_email_password_or_confirmation(): void
    {
        $user = User::factory()->create([
            'email' => 'hybrid-reject@example.com',
            'password' => Hash::make('correct-password'),
        ]);
        $user->oauthIdentities()->create([
            'provider' => 'github',
            'provider_user_id' => 'hybrid-github-user',
            'provider_email' => $user->email,
            'avatar_url' => null,
        ]);

        $service = app(AccountDeleteConfirmationService::class);

        $this->assertFalse($service->confirm($user, [
            'email' => 'another@example.com',
            'current_password' => 'correct-password',
            'confirm_delete' => true,
        ]));
        $this->assertFalse($service->confirm($user, [
            'email' => $user->email,
            'current_password' => 'wrong-password',
            'confirm_delete' => true,
        ]));
        $this->assertFalse($service->confirm($user, [
            'email' => $user->email,
            'current_password' => 'correct-password',
            'confirm_delete' => 'true',
        ]));
    }

    public function test_oauth_only_account_requires_and_consumes_a_verified_challenge(): void
    {
        $user = User::factory()->create([
            'email' => 'oauth-delete@example.com',
            'password' => null,
        ]);
        $providerUserId = 'oauth-delete-google-user';
        $user->oauthIdentities()->create([
            'provider' => 'google',
            'provider_user_id' => $providerUserId,
            'provider_email' => $user->email,
            'avatar_url' => null,
        ]);
        $token = $user->createToken('account-delete-confirmation');
        $accessTokenId = (int) $token->accessToken->getKey();

        $reauthService = app(AccountDeleteReauthService::class);
        $challenge = $reauthService->issue(
            userId: (int) $user->getKey(),
            accessTokenId: $accessTokenId,
            provider: 'google',
            providerUserId: $providerUserId,
        );

        $confirmation = [
            'email' => $user->email,
            'challenge_id' => $challenge['challenge'],
            'confirm_delete' => true,
        ];
        $service = app(AccountDeleteConfirmationService::class);

        $this->assertFalse($service->confirm($user, $confirmation, $accessTokenId));
        $this->assertTrue($reauthService->verify(
            state: $challenge['state'],
            provider: 'google',
            providerUserId: $providerUserId,
        ));
        $this->assertTrue($service->confirm($user, $confirmation, $accessTokenId));
        $this->assertSame(
            'consumed',
            $reauthService->status(
                challengeId: $challenge['challenge'],
                userId: (int) $user->getKey(),
                accessTokenId: $accessTokenId,
            ),
        );
        $this->assertFalse($service->confirm($user, $confirmation, $accessTokenId));
    }

    public function test_account_without_password_or_login_identity_cannot_confirm_deletion(): void
    {
        $user = User::factory()->create([
            'email' => 'unclassified-delete@example.com',
            'password' => null,
        ]);

        $this->assertFalse(app(AccountDeleteConfirmationService::class)->confirm($user, [
            'email' => $user->email,
            'challenge_id' => str_repeat('a', 64),
            'confirm_delete' => true,
        ], 1));
    }
}

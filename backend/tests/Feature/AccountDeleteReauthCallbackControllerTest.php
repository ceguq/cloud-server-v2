<?php

namespace Tests\Feature;

use App\Services\AccountDeleteReauthService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Socialite\Facades\Socialite;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class AccountDeleteReauthCallbackControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutExceptionHandling();
    }

    protected function tearDown(): void
    {
        \Mockery::close();

        parent::tearDown();
    }

    #[Test]
    public function google_delete_reauth_callback_requires_state(): void
    {
        $response = $this->get(
            '/auth/oauth/google/delete-reauth/callback'
        );

        $expectedRedirect = rtrim(
            (string) config('app.frontend_url'),
            '/'
        ).'/settings?delete_reauth=failed';

        $response->assertRedirect($expectedRedirect);

        $redirectLocation = (string) $response->headers->get('Location');

        foreach ([
            'state',
            'provider_user_id',
            'user_id',
            'access_token_id',
            'challenge_id',
            'exception',
        ] as $sensitiveValue) {
            $this->assertStringNotContainsString(
                $sensitiveValue,
                strtolower($redirectLocation)
            );
        }
    }

    #[Test]
    public function github_delete_reauth_callback_requires_state(): void
    {
        $response = $this->get(
            '/auth/oauth/github/delete-reauth/callback'
        );

        $expectedRedirect = rtrim(
            (string) config('app.frontend_url'),
            '/'
        ).'/settings?delete_reauth=failed';

        $response->assertRedirect($expectedRedirect);

        $redirectLocation = (string) $response->headers->get('Location');

        foreach ([
            'state',
            'provider_user_id',
            'user_id',
            'access_token_id',
            'challenge_id',
            'exception',
        ] as $sensitiveValue) {
            $this->assertStringNotContainsString(
                $sensitiveValue,
                strtolower($redirectLocation)
            );
        }
    }

    #[Test]
    public function google_delete_reauth_callback_rejects_failed_verification(): void
    {
        $providerUser = \Mockery::mock();

        $providerUser
            ->shouldReceive('getId')
            ->once()
            ->andReturn('exact-provider-user-id');

        $driver = \Mockery::mock();

        $driver
            ->shouldReceive('stateless')
            ->once()
            ->andReturnSelf();

        $driver
            ->shouldReceive('redirectUrl')
            ->once()
            ->with(route('delete-reauth.google.callback'))
            ->andReturnSelf();

        $driver
            ->shouldReceive('user')
            ->once()
            ->andReturn($providerUser);

        Socialite::shouldReceive('driver')
            ->once()
            ->with('google')
            ->andReturn($driver);

        $service = \Mockery::mock(
            AccountDeleteReauthService::class
        );

        $service
            ->shouldReceive('verify')
            ->once()
            ->with(
                'opaque-state',
                'google',
                'exact-provider-user-id'
            )
            ->andReturnFalse();

        $this->instance(
            AccountDeleteReauthService::class,
            $service
        );

        $response = $this->get(
            '/auth/oauth/google/delete-reauth/callback?state=opaque-state'
        );

        $response->assertRedirect(
            rtrim((string) config('app.frontend_url'), '/')
                .'/settings?delete_reauth=failed'
        );
    }

    #[Test]
    public function github_delete_reauth_callback_rejects_failed_verification(): void
    {
        $providerUser = \Mockery::mock();

        $providerUser
            ->shouldReceive('getId')
            ->once()
            ->andReturn('exact-provider-user-id');

        $driver = \Mockery::mock();

        $driver
            ->shouldReceive('stateless')
            ->once()
            ->andReturnSelf();

        $driver
            ->shouldReceive('redirectUrl')
            ->once()
            ->with(route('delete-reauth.github.callback'))
            ->andReturnSelf();

        $driver
            ->shouldReceive('user')
            ->once()
            ->andReturn($providerUser);

        Socialite::shouldReceive('driver')
            ->once()
            ->with('github')
            ->andReturn($driver);

        $service = \Mockery::mock(
            AccountDeleteReauthService::class
        );

        $service
            ->shouldReceive('verify')
            ->once()
            ->with(
                'opaque-state',
                'github',
                'exact-provider-user-id'
            )
            ->andReturnFalse();

        $this->instance(
            AccountDeleteReauthService::class,
            $service
        );

        $response = $this->get(
            '/auth/oauth/github/delete-reauth/callback?state=opaque-state'
        );

        $response->assertRedirect(
            rtrim((string) config('app.frontend_url'), '/')
                .'/settings?delete_reauth=failed'
        );
    }

    #[Test]
    public function google_delete_reauth_callback_accepts_successful_verification(): void
    {
        $providerUser = \Mockery::mock();

        $providerUser
            ->shouldReceive('getId')
            ->once()
            ->andReturn('exact-provider-user-id');

        $driver = \Mockery::mock();

        $driver
            ->shouldReceive('stateless')
            ->once()
            ->andReturnSelf();

        $driver
            ->shouldReceive('redirectUrl')
            ->once()
            ->with(route('delete-reauth.google.callback'))
            ->andReturnSelf();

        $driver
            ->shouldReceive('user')
            ->once()
            ->andReturn($providerUser);

        Socialite::shouldReceive('driver')
            ->once()
            ->with('google')
            ->andReturn($driver);

        $service = \Mockery::mock(
            AccountDeleteReauthService::class
        );

        $service
            ->shouldReceive('verify')
            ->once()
            ->with(
                'opaque-state',
                'google',
                'exact-provider-user-id'
            )
            ->andReturnTrue();

        $this->instance(
            AccountDeleteReauthService::class,
            $service
        );

        $response = $this->get(
            '/auth/oauth/google/delete-reauth/callback?state=opaque-state'
        );

        $response->assertRedirect(
            rtrim((string) config('app.frontend_url'), '/')
                .'/settings?delete_reauth=success'
        );
    }

    #[Test]
    public function github_delete_reauth_callback_accepts_successful_verification(): void
    {
        $providerUser = \Mockery::mock();

        $providerUser
            ->shouldReceive('getId')
            ->once()
            ->andReturn('exact-provider-user-id');

        $driver = \Mockery::mock();

        $driver
            ->shouldReceive('stateless')
            ->once()
            ->andReturnSelf();

        $driver
            ->shouldReceive('redirectUrl')
            ->once()
            ->with(route('delete-reauth.github.callback'))
            ->andReturnSelf();

        $driver
            ->shouldReceive('user')
            ->once()
            ->andReturn($providerUser);

        Socialite::shouldReceive('driver')
            ->once()
            ->with('github')
            ->andReturn($driver);

        $service = \Mockery::mock(
            AccountDeleteReauthService::class
        );

        $service
            ->shouldReceive('verify')
            ->once()
            ->with(
                'opaque-state',
                'github',
                'exact-provider-user-id'
            )
            ->andReturnTrue();

        $this->instance(
            AccountDeleteReauthService::class,
            $service
        );

        $response = $this->get(
            '/auth/oauth/github/delete-reauth/callback?state=opaque-state'
        );

        $response->assertRedirect(
            rtrim((string) config('app.frontend_url'), '/')
                .'/settings?delete_reauth=success'
        );
    }

    #[Test]
    public function google_delete_reauth_callback_handles_socialite_exception_safely(): void
    {
        $driver = \Mockery::mock();

        $driver
            ->shouldReceive('stateless')
            ->once()
            ->andReturnSelf();

        $driver
            ->shouldReceive('redirectUrl')
            ->once()
            ->with(route('delete-reauth.google.callback'))
            ->andReturnSelf();

        $driver
            ->shouldReceive('user')
            ->once()
            ->andThrow(new \RuntimeException('provider failure'));

        Socialite::shouldReceive('driver')
            ->once()
            ->with('google')
            ->andReturn($driver);

        $service = \Mockery::mock(
            AccountDeleteReauthService::class
        );

        $service
            ->shouldNotReceive('verify');

        $this->instance(
            AccountDeleteReauthService::class,
            $service
        );

        $response = $this->get(
            '/auth/oauth/google/delete-reauth/callback?state=opaque-state'
        );

        $response->assertRedirect(
            rtrim((string) config('app.frontend_url'), '/')
                .'/settings?delete_reauth=failed'
        );
    }
}

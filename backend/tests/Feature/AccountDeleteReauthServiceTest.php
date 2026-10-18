<?php

namespace Tests\Feature;

use App\Services\AccountDeleteReauthService;
use Illuminate\Support\Carbon;
use InvalidArgumentException;
use RuntimeException;
use Tests\TestCase;

class AccountDeleteReauthServiceTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config(['cache.default' => 'file']);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    public function test_issue_rejects_non_persistent_array_cache(): void
    {
        config(['cache.default' => 'array']);

        $service = new AccountDeleteReauthService;

        $issueRejected = false;

        try {
            $service->issue(
                userId: 1001,
                accessTokenId: 2001,
                provider: 'google',
                providerUserId: 'google-user-1001',
            );
        } catch (RuntimeException $exception) {
            $issueRejected = true;
            $this->assertSame(
                'Account deletion reauth challenges require a persistent cache store.',
                $exception->getMessage(),
            );
        }

        $statusRejected = false;

        try {
            $service->status(
                challengeId: str_repeat('a', 64),
                userId: 1001,
                accessTokenId: 2001,
            );
        } catch (RuntimeException $exception) {
            $statusRejected = true;
            $this->assertSame(
                'Account deletion reauth challenges require a persistent cache store.',
                $exception->getMessage(),
            );
        }

        $this->assertTrue($issueRejected);
        $this->assertTrue($statusRejected);
    }

    public function test_issue_returns_safe_payload_and_pending_status(): void
    {
        Carbon::setTestNow(Carbon::parse('2035-01-01T00:00:00Z'));

        $service = new AccountDeleteReauthService;

        $payload = $service->issue(
            userId: 1002,
            accessTokenId: 2002,
            provider: 'google',
            providerUserId: 'google-user-1002',
        );

        $this->assertSame(['challenge', 'state', 'expires_at'], array_keys($payload));
        $this->assertMatchesRegularExpression('/\A[a-f0-9]{64}\z/', $payload['challenge']);
        $this->assertMatchesRegularExpression('/\A[a-f0-9]{64}\z/', $payload['state']);
        $this->assertNotSame($payload['challenge'], $payload['state']);
        $this->assertSame('2035-01-01T00:10:00Z', $payload['expires_at']);
        $this->assertSame(
            'pending',
            $service->status(
                challengeId: $payload['challenge'],
                userId: 1002,
                accessTokenId: 2002,
            ),
        );
    }

    public function test_issue_normalizes_supported_provider(): void
    {
        Carbon::setTestNow(Carbon::parse('2035-01-01T00:20:00Z'));

        $service = new AccountDeleteReauthService;

        $payload = $service->issue(
            userId: 1003,
            accessTokenId: 2003,
            provider: ' GiThUb ',
            providerUserId: 'github-user-1003',
        );

        $this->assertSame(
            'pending',
            $service->status(
                challengeId: $payload['challenge'],
                userId: 1003,
                accessTokenId: 2003,
            ),
        );
    }

    public function test_issue_rejects_unsupported_provider_and_empty_provider_user_id(): void
    {
        $service = new AccountDeleteReauthService;

        $unsupportedProviderRejected = false;

        try {
            $service->issue(
                userId: 1004,
                accessTokenId: 2004,
                provider: 'facebook',
                providerUserId: 'facebook-user-1004',
            );
        } catch (InvalidArgumentException $exception) {
            $unsupportedProviderRejected = true;
            $this->assertSame('Unsupported provider.', $exception->getMessage());
        }

        $emptyProviderUserIdRejected = false;

        try {
            $service->issue(
                userId: 1004,
                accessTokenId: 2004,
                provider: 'google',
                providerUserId: '   ',
            );
        } catch (InvalidArgumentException $exception) {
            $emptyProviderUserIdRejected = true;
            $this->assertSame('Provider user id is required.', $exception->getMessage());
        }

        $this->assertTrue($unsupportedProviderRejected);
        $this->assertTrue($emptyProviderUserIdRejected);
    }

    public function test_status_returns_invalid_for_missing_malformed_or_unknown_challenge(): void
    {
        $service = new AccountDeleteReauthService;

        $this->assertSame(
            'invalid',
            $service->status(
                challengeId: '',
                userId: 1005,
                accessTokenId: 2005,
            ),
        );

        $this->assertSame(
            'invalid',
            $service->status(
                challengeId: 'not-a-valid-challenge',
                userId: 1005,
                accessTokenId: 2005,
            ),
        );

        $this->assertSame(
            'invalid',
            $service->status(
                challengeId: str_repeat('a', 64),
                userId: 1005,
                accessTokenId: 2005,
            ),
        );
    }

    public function test_status_is_bound_to_the_same_user_and_access_token(): void
    {
        Carbon::setTestNow(Carbon::parse('2035-01-01T00:30:00Z'));

        $service = new AccountDeleteReauthService;

        $payload = $service->issue(
            userId: 1006,
            accessTokenId: 2006,
            provider: 'google',
            providerUserId: 'google-user-1006',
        );

        $this->assertSame(
            'invalid',
            $service->status(
                challengeId: $payload['challenge'],
                userId: 1007,
                accessTokenId: 2006,
            ),
        );

        $this->assertSame(
            'invalid',
            $service->status(
                challengeId: $payload['challenge'],
                userId: 1006,
                accessTokenId: 2007,
            ),
        );

        $this->assertSame(
            'pending',
            $service->status(
                challengeId: $payload['challenge'],
                userId: 1006,
                accessTokenId: 2006,
            ),
        );
    }

    public function test_newer_challenge_invalidates_older_challenge_for_same_user_and_token(): void
    {
        Carbon::setTestNow(Carbon::parse('2035-01-01T00:40:00Z'));

        $service = new AccountDeleteReauthService;

        $olderPayload = $service->issue(
            userId: 1008,
            accessTokenId: 2008,
            provider: 'google',
            providerUserId: 'google-user-1008',
        );

        $newerPayload = $service->issue(
            userId: 1008,
            accessTokenId: 2008,
            provider: 'github',
            providerUserId: 'github-user-1008',
        );

        $this->assertNotSame($olderPayload['challenge'], $newerPayload['challenge']);
        $this->assertSame(
            'invalid',
            $service->status(
                challengeId: $olderPayload['challenge'],
                userId: 1008,
                accessTokenId: 2008,
            ),
        );
        $this->assertSame(
            'pending',
            $service->status(
                challengeId: $newerPayload['challenge'],
                userId: 1008,
                accessTokenId: 2008,
            ),
        );
    }

    public function test_new_challenge_does_not_invalidate_other_tokens_or_users(): void
    {
        Carbon::setTestNow(Carbon::parse('2035-01-01T00:50:00Z'));

        $service = new AccountDeleteReauthService;

        $samePairOriginalPayload = $service->issue(
            userId: 1009,
            accessTokenId: 2009,
            provider: 'google',
            providerUserId: 'google-user-1009',
        );

        $otherTokenPayload = $service->issue(
            userId: 1009,
            accessTokenId: 2010,
            provider: 'google',
            providerUserId: 'google-user-1009',
        );

        $otherUserPayload = $service->issue(
            userId: 1010,
            accessTokenId: 2009,
            provider: 'github',
            providerUserId: 'github-user-1010',
        );

        $samePairReplacementPayload = $service->issue(
            userId: 1009,
            accessTokenId: 2009,
            provider: 'github',
            providerUserId: 'github-user-1009',
        );

        $this->assertSame(
            'invalid',
            $service->status(
                challengeId: $samePairOriginalPayload['challenge'],
                userId: 1009,
                accessTokenId: 2009,
            ),
        );
        $this->assertSame(
            'pending',
            $service->status(
                challengeId: $samePairReplacementPayload['challenge'],
                userId: 1009,
                accessTokenId: 2009,
            ),
        );
        $this->assertSame(
            'pending',
            $service->status(
                challengeId: $otherTokenPayload['challenge'],
                userId: 1009,
                accessTokenId: 2010,
            ),
        );
        $this->assertSame(
            'pending',
            $service->status(
                challengeId: $otherUserPayload['challenge'],
                userId: 1010,
                accessTokenId: 2009,
            ),
        );
    }

    public function test_challenge_expires_at_exactly_six_hundred_seconds(): void
    {
        $issuedAt = Carbon::parse('2035-01-01T01:00:00Z');
        Carbon::setTestNow($issuedAt);

        $service = new AccountDeleteReauthService;

        $payload = $service->issue(
            userId: 1011,
            accessTokenId: 2011,
            provider: 'google',
            providerUserId: 'google-user-1011',
        );

        Carbon::setTestNow($issuedAt->copy()->addSeconds(599));

        $this->assertSame(
            'pending',
            $service->status(
                challengeId: $payload['challenge'],
                userId: 1011,
                accessTokenId: 2011,
            ),
        );

        Carbon::setTestNow($issuedAt->copy()->addSeconds(600));

        $this->assertSame(
            'expired',
            $service->status(
                challengeId: $payload['challenge'],
                userId: 1011,
                accessTokenId: 2011,
            ),
        );
    }

    public function test_verify_marks_matching_active_challenge_as_verified(): void
    {
        Carbon::setTestNow(Carbon::parse('2035-01-01T01:10:00Z'));

        $service = new AccountDeleteReauthService;

        $payload = $service->issue(
            userId: 1012,
            accessTokenId: 2012,
            provider: 'google',
            providerUserId: 'google-user-1012',
        );

        $this->assertTrue(
            $service->verify(
                state: $payload['state'],
                provider: 'google',
                providerUserId: 'google-user-1012',
            ),
        );
        $this->assertSame(
            'verified',
            $service->status(
                challengeId: $payload['challenge'],
                userId: 1012,
                accessTokenId: 2012,
            ),
        );
    }

    public function test_verify_returns_false_for_empty_malformed_or_unknown_state(): void
    {
        Carbon::setTestNow(Carbon::parse('2035-01-01T01:20:00Z'));

        $service = new AccountDeleteReauthService;

        $payload = $service->issue(
            userId: 1013,
            accessTokenId: 2013,
            provider: 'github',
            providerUserId: 'github-user-1013',
        );

        $this->assertFalse(
            $service->verify(
                state: '',
                provider: 'github',
                providerUserId: 'github-user-1013',
            ),
        );
        $this->assertFalse(
            $service->verify(
                state: 'not-a-valid-state',
                provider: 'github',
                providerUserId: 'github-user-1013',
            ),
        );
        $this->assertFalse(
            $service->verify(
                state: str_repeat('b', 64),
                provider: 'github',
                providerUserId: 'github-user-1013',
            ),
        );
        $this->assertSame(
            'pending',
            $service->status(
                challengeId: $payload['challenge'],
                userId: 1013,
                accessTokenId: 2013,
            ),
        );
    }

    public function test_verify_rejects_mismatched_provider(): void
    {
        Carbon::setTestNow(Carbon::parse('2035-01-01T01:30:00Z'));

        $service = new AccountDeleteReauthService;

        $payload = $service->issue(
            userId: 1014,
            accessTokenId: 2014,
            provider: 'google',
            providerUserId: 'google-user-1014',
        );

        $this->assertFalse(
            $service->verify(
                state: $payload['state'],
                provider: 'github',
                providerUserId: 'google-user-1014',
            ),
        );
        $this->assertSame(
            'pending',
            $service->status(
                challengeId: $payload['challenge'],
                userId: 1014,
                accessTokenId: 2014,
            ),
        );
    }

    public function test_verify_rejects_mismatched_provider_user_id(): void
    {
        Carbon::setTestNow(Carbon::parse('2035-01-01T01:40:00Z'));

        $service = new AccountDeleteReauthService;

        $payload = $service->issue(
            userId: 1015,
            accessTokenId: 2015,
            provider: 'github',
            providerUserId: 'github-user-1015',
        );

        $this->assertFalse(
            $service->verify(
                state: $payload['state'],
                provider: 'github',
                providerUserId: 'github-user-other',
            ),
        );
        $this->assertSame(
            'pending',
            $service->status(
                challengeId: $payload['challenge'],
                userId: 1015,
                accessTokenId: 2015,
            ),
        );
    }

    public function test_verify_rejects_expired_challenge(): void
    {
        $issuedAt = Carbon::parse('2035-01-01T01:50:00Z');
        Carbon::setTestNow($issuedAt);

        $service = new AccountDeleteReauthService;

        $payload = $service->issue(
            userId: 1016,
            accessTokenId: 2016,
            provider: 'google',
            providerUserId: 'google-user-1016',
        );

        Carbon::setTestNow($issuedAt->copy()->addSeconds(600));

        $this->assertFalse(
            $service->verify(
                state: $payload['state'],
                provider: 'google',
                providerUserId: 'google-user-1016',
            ),
        );
        $this->assertSame(
            'expired',
            $service->status(
                challengeId: $payload['challenge'],
                userId: 1016,
                accessTokenId: 2016,
            ),
        );
    }

    public function test_verify_rejects_invalidated_challenge(): void
    {
        Carbon::setTestNow(Carbon::parse('2035-01-01T02:00:00Z'));

        $service = new AccountDeleteReauthService;

        $olderPayload = $service->issue(
            userId: 1017,
            accessTokenId: 2017,
            provider: 'google',
            providerUserId: 'google-user-1017',
        );

        $newerPayload = $service->issue(
            userId: 1017,
            accessTokenId: 2017,
            provider: 'google',
            providerUserId: 'google-user-1017',
        );

        $this->assertFalse(
            $service->verify(
                state: $olderPayload['state'],
                provider: 'google',
                providerUserId: 'google-user-1017',
            ),
        );
        $this->assertSame(
            'invalid',
            $service->status(
                challengeId: $olderPayload['challenge'],
                userId: 1017,
                accessTokenId: 2017,
            ),
        );
        $this->assertSame(
            'pending',
            $service->status(
                challengeId: $newerPayload['challenge'],
                userId: 1017,
                accessTokenId: 2017,
            ),
        );
    }

    public function test_verified_oauth_state_cannot_be_replayed(): void
    {
        $service = app(AccountDeleteReauthService::class);

        $issued = $service->issue(
            userId: 10,
            accessTokenId: 100,
            provider: 'google',
            providerUserId: 'google-user-10',
        );

        $firstVerification = $service->verify(
            $issued['state'],
            'google',
            'google-user-10',
        );

        $secondVerification = $service->verify(
            $issued['state'],
            'google',
            'google-user-10',
        );

        $this->assertTrue($firstVerification);
        $this->assertFalse($secondVerification);

        $this->assertSame(
            'verified',
            $service->status($issued['challenge'], 10, 100),
        );
    }

    public function test_verified_account_delete_reauthentication_challenge_can_be_consumed_only_once(): void
    {
        $service = app(AccountDeleteReauthService::class);

        $issued = $service->issue(
            userId: 20,
            accessTokenId: 200,
            provider: 'google',
            providerUserId: 'google-user-20',
        );

        $verificationSucceeded = $service->verify(
            state: $issued['state'],
            provider: 'google',
            providerUserId: 'google-user-20',
        );

        $this->assertTrue($verificationSucceeded);
        $this->assertSame(
            'verified',
            $service->status(
                challengeId: $issued['challenge'],
                userId: 20,
                accessTokenId: 200,
            ),
        );

        $firstConsumptionSucceeded = $service->consume(
            challengeId: $issued['challenge'],
            userId: 20,
            accessTokenId: 200,
        );

        $this->assertTrue($firstConsumptionSucceeded);
        $this->assertSame(
            'consumed',
            $service->status(
                challengeId: $issued['challenge'],
                userId: 20,
                accessTokenId: 200,
            ),
        );

        $secondConsumptionSucceeded = $service->consume(
            challengeId: $issued['challenge'],
            userId: 20,
            accessTokenId: 200,
        );

        $this->assertFalse($secondConsumptionSucceeded);
        $this->assertSame(
            'consumed',
            $service->status(
                challengeId: $issued['challenge'],
                userId: 20,
                accessTokenId: 200,
            ),
        );
    }
}

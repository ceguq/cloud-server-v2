<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Cache;
use InvalidArgumentException;
use RuntimeException;

class OAuthExchangeService
{
    private const CODE_BYTES = 32;

    private const TTL_SECONDS = 300;

    private const LOCK_SECONDS = 10;

    private const LOCK_WAIT_SECONDS = 3;

    private const MAX_ISSUE_ATTEMPTS = 3;

    private const ALLOWED_PROVIDERS = [
        'google',
        'github',
    ];

    public function issue(User $user, string $provider): string
    {
        $this->assertPersistentCacheStore();

        $provider = strtolower($provider);

        if (! in_array($provider, self::ALLOWED_PROVIDERS, true)) {
            throw new InvalidArgumentException('Unsupported OAuth provider.');
        }

        for ($attempt = 0; $attempt < self::MAX_ISSUE_ATTEMPTS; $attempt++) {
            $code = bin2hex(random_bytes(self::CODE_BYTES));
            $exchangeKey = $this->exchangeKey($code);

            $stored = Cache::add($exchangeKey, [
                'user_id' => $user->getKey(),
                'provider' => $provider,
                'issued_at' => now()->timestamp,
            ], self::TTL_SECONDS);

            if ($stored) {
                return $code;
            }
        }

        throw new RuntimeException('Unable to issue a unique OAuth exchange code.');
    }

    public function consume(string $code): ?array
    {
        $this->assertPersistentCacheStore();

        if (! $this->isValidCode($code)) {
            return null;
        }

        $exchangeKey = $this->exchangeKey($code);
        $lockKey = $this->lockKey($code);

        return Cache::lock($lockKey, self::LOCK_SECONDS)
            ->block(self::LOCK_WAIT_SECONDS, function () use ($exchangeKey) {
                $payload = Cache::pull($exchangeKey);

                return $this->validPayload($payload);
            });
    }

    private function assertPersistentCacheStore(): void
    {
        $store = config('cache.default');

        if ($store === null || $store === 'array') {
            throw new RuntimeException('OAuth exchange requires a persistent cache store.');
        }
    }

    private function isValidCode(string $code): bool
    {
        return preg_match('/\A[a-f0-9]{64}\z/', $code) === 1;
    }

    private function exchangeKey(string $code): string
    {
        return 'oauth_exchange:'.$this->codeHash($code);
    }

    private function lockKey(string $code): string
    {
        return 'oauth_exchange_lock:'.$this->codeHash($code);
    }

    private function codeHash(string $code): string
    {
        return hash('sha256', $code);
    }

    private function validPayload(mixed $payload): ?array
    {
        if (! is_array($payload)) {
            return null;
        }

        if (
            ! array_key_exists('user_id', $payload) ||
            ! array_key_exists('provider', $payload) ||
            ! array_key_exists('issued_at', $payload)
        ) {
            return null;
        }

        if (! in_array($payload['provider'], self::ALLOWED_PROVIDERS, true)) {
            return null;
        }

        $userId = $payload['user_id'];

        $isValidUserId = is_int($userId)
            || (is_string($userId) && trim($userId) !== '');

        if (! $isValidUserId) {
            return null;
        }

        if (filter_var($payload['issued_at'], FILTER_VALIDATE_INT) === false) {
            return null;
        }

        $issuedAt = (int) $payload['issued_at'];
        $now = now()->timestamp;

        if (
            $issuedAt <= 0
            || $issuedAt > ($now + 5)
            || ($now - $issuedAt) > self::TTL_SECONDS
        ) {
            return null;
        }

        return [
            'user_id' => $userId,
            'provider' => $payload['provider'],
            'issued_at' => $issuedAt,
        ];
    }
}

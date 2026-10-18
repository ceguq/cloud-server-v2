<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Support\Facades\Cache;
use InvalidArgumentException;
use RuntimeException;

class OAuthLinkStateService
{
    private const PREFIX = 'oauth-link-v1-';

    private const CACHE_PREFIX = 'oauth_link_state';

    private const TTL_SECONDS = 600;

    private const LOCK_SECONDS = 10;

    private const LOCK_WAIT_SECONDS = 3;

    private const ALLOWED_PROVIDERS = [
        'google',
        'github',
    ];

    public function issue(User $user, string $provider): string
    {
        $this->guardPersistentCache();
        $provider = $this->normalizeProvider($provider);

        for ($attempt = 0; $attempt < 3; $attempt++) {
            $state = self::PREFIX.bin2hex(random_bytes(32));
            $stored = Cache::add(
                $this->stateKey($state),
                [
                    'user_id' => $user->getKey(),
                    'provider' => $provider,
                    'issued_at' => now()->timestamp,
                ],
                self::TTL_SECONDS,
            );

            if ($stored) {
                return $state;
            }
        }

        throw new RuntimeException('Unable to issue an OAuth link state.');
    }

    public function isLinkState(mixed $state): bool
    {
        return is_string($state)
            && preg_match('/\A'.preg_quote(self::PREFIX, '/').'[a-f0-9]{64}\z/', $state) === 1;
    }

    /**
     * @return array{user_id: int|string, provider: string}|null
     */
    public function consume(string $state, string $provider): ?array
    {
        $this->guardPersistentCache();
        $provider = $this->normalizeProvider($provider);

        if (! $this->isLinkState($state)) {
            return null;
        }

        $stateKey = $this->stateKey($state);

        try {
            return Cache::lock($this->lockKey($state), self::LOCK_SECONDS)
                ->block(self::LOCK_WAIT_SECONDS, function () use ($stateKey, $provider): ?array {
                    $payload = Cache::get($stateKey);

                    if (! $this->isValidPayload($payload, $provider)) {
                        return null;
                    }

                    Cache::forget($stateKey);

                    return [
                        'user_id' => $payload['user_id'],
                        'provider' => $payload['provider'],
                    ];
                });
        } catch (LockTimeoutException $exception) {
            throw new RuntimeException('Unable to consume the OAuth link state.', previous: $exception);
        }
    }

    private function guardPersistentCache(): void
    {
        if (config('cache.default') === 'array') {
            throw new RuntimeException('OAuth link states require a persistent cache store.');
        }
    }

    private function normalizeProvider(string $provider): string
    {
        $provider = strtolower(trim($provider));

        if (! in_array($provider, self::ALLOWED_PROVIDERS, true)) {
            throw new InvalidArgumentException('Unsupported OAuth provider.');
        }

        return $provider;
    }

    private function isValidPayload(mixed $payload, string $provider): bool
    {
        if (! is_array($payload)) {
            return false;
        }

        $userId = $payload['user_id'] ?? null;
        $isValidUserId = is_int($userId)
            || (is_string($userId) && trim($userId) !== '');

        if (
            ! $isValidUserId
            || ($payload['provider'] ?? null) !== $provider
            || filter_var($payload['issued_at'] ?? null, FILTER_VALIDATE_INT) === false
        ) {
            return false;
        }

        $issuedAt = (int) $payload['issued_at'];
        $now = now()->timestamp;

        return $issuedAt > 0
            && $issuedAt <= ($now + 5)
            && ($now - $issuedAt) <= self::TTL_SECONDS;
    }

    private function stateKey(string $state): string
    {
        return self::CACHE_PREFIX.':'.hash('sha256', $state);
    }

    private function lockKey(string $state): string
    {
        return self::CACHE_PREFIX.':lock:'.hash('sha256', $state);
    }
}

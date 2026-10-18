<?php

namespace App\Services;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use InvalidArgumentException;
use RuntimeException;

class AccountDeleteReauthService
{
    private const CACHE_PREFIX = 'account-delete-reauth';

    private const INTENT = 'account_delete';

    private const VALIDITY_SECONDS = 600;

    private const RETENTION_SECONDS = 3600;

    /**
     * @return array{challenge: string, state: string, expires_at: string}
     */
    public function issue(
        int $userId,
        int $accessTokenId,
        string $provider,
        string $providerUserId,
    ): array {
        $this->guardPersistentCache();

        $provider = $this->normalizeProvider($provider);
        $providerUserId = trim($providerUserId);

        if ($providerUserId === '') {
            throw new InvalidArgumentException('Provider user id is required.');
        }

        $challengeId = bin2hex(random_bytes(32));
        $state = bin2hex(random_bytes(32));
        $issuedAt = Carbon::now('UTC');
        $expiresAt = $issuedAt->copy()->addSeconds(self::VALIDITY_SECONDS);
        $cacheExpiresAt = $issuedAt->copy()->addSeconds(self::RETENTION_SECONDS);

        $previousChallengeId = Cache::get($this->latestKey($userId, $accessTokenId));

        if (is_string($previousChallengeId) && $this->isWellFormedChallenge($previousChallengeId)) {
            $previousRecord = Cache::get($this->recordKey($previousChallengeId));

            if (is_array($previousRecord)) {
                $previousRecord['invalidated_at'] = $this->serializeDate($issuedAt);
                Cache::put($this->recordKey($previousChallengeId), $previousRecord, $cacheExpiresAt);
            }
        }

        Cache::put($this->recordKey($challengeId), [
            'intent' => self::INTENT,
            'user_id' => $userId,
            'access_token_id' => $accessTokenId,
            'provider' => $provider,
            'provider_user_id' => $providerUserId,
            'state_hash' => hash('sha256', $state),
            'issued_at' => $this->serializeDate($issuedAt),
            'expires_at' => $this->serializeDate($expiresAt),
            'verified_at' => null,
            'consumed_at' => null,
            'invalidated_at' => null,
            'cache_expires_at' => $this->serializeDate($cacheExpiresAt),
        ], $cacheExpiresAt);

        Cache::put($this->stateKey($state), $challengeId, $cacheExpiresAt);
        Cache::put($this->latestKey($userId, $accessTokenId), $challengeId, $cacheExpiresAt);

        return [
            'challenge' => $challengeId,
            'state' => $state,
            'expires_at' => $this->serializeDate($expiresAt),
        ];
    }

    public function status(
        string $challengeId,
        int $userId,
        int $accessTokenId,
    ): string {
        $this->guardPersistentCache();

        if (! $this->isWellFormedChallenge($challengeId)) {
            return 'invalid';
        }

        $record = Cache::get($this->recordKey($challengeId));

        if (! is_array($record)) {
            return 'invalid';
        }

        if (($record['user_id'] ?? null) !== $userId) {
            return 'invalid';
        }

        if (($record['access_token_id'] ?? null) !== $accessTokenId) {
            return 'invalid';
        }

        if (($record['intent'] ?? null) !== self::INTENT) {
            return 'invalid';
        }

        if (($record['invalidated_at'] ?? null) !== null) {
            return 'invalid';
        }

        if (($record['consumed_at'] ?? null) !== null) {
            return 'consumed';
        }

        $expiresAt = $this->expiresAt($record);

        if ($expiresAt === null) {
            return 'invalid';
        }

        if (Carbon::now('UTC')->greaterThanOrEqualTo($expiresAt)) {
            return 'expired';
        }

        if (($record['verified_at'] ?? null) !== null) {
            return 'verified';
        }

        return 'pending';
    }

    public function verify(
        string $state,
        string $provider,
        string $providerUserId,
    ): bool {
        $this->guardPersistentCache();

        if (! $this->isWellFormedToken($state)) {
            return false;
        }

        try {
            $provider = $this->normalizeProvider($provider);
        } catch (InvalidArgumentException) {
            return false;
        }

        $challengeId = Cache::get($this->stateKey($state));

        if (! is_string($challengeId) || ! $this->isWellFormedChallenge($challengeId)) {
            return false;
        }

        return Cache::lock($this->lockKey($challengeId), 10)->get(function () use ($state, $provider, $providerUserId, $challengeId): bool {
            $lockedChallengeId = Cache::get($this->stateKey($state));

            if (! is_string($lockedChallengeId) || $lockedChallengeId !== $challengeId) {
                return false;
            }

            $payload = Cache::get($this->recordKey($challengeId));

            if (! is_array($payload)) {
                return false;
            }

            if (! isset($payload['state_hash']) || ! is_string($payload['state_hash'])) {
                return false;
            }

            if (! hash_equals($payload['state_hash'], hash('sha256', $state))) {
                return false;
            }

            if (($payload['verified_at'] ?? null) !== null) {
                return false;
            }

            if (($payload['invalidated_at'] ?? null) !== null) {
                return false;
            }

            if (($payload['consumed_at'] ?? null) !== null) {
                return false;
            }

            $expiresAt = $this->expiresAt($payload);

            if ($expiresAt === null || Carbon::now('UTC')->greaterThanOrEqualTo($expiresAt)) {
                return false;
            }

            if (($payload['provider'] ?? null) !== $provider) {
                return false;
            }

            if (($payload['provider_user_id'] ?? null) !== $providerUserId) {
                return false;
            }

            if (($payload['intent'] ?? null) !== self::INTENT) {
                return false;
            }

            $payload['verified_at'] = $this->serializeDate(Carbon::now('UTC'));
            Cache::put($this->recordKey($challengeId), $payload, $this->cacheExpiresAt($payload));
            Cache::forget($this->stateKey($state));

            return true;
        });
    }

    public function consume(
        string $challengeId,
        int $userId,
        int $accessTokenId,
    ): bool {
        $this->guardPersistentCache();

        if (! $this->isWellFormedChallenge($challengeId)) {
            return false;
        }

        // Access token and user id must be provided as positive integers.
        if ($userId <= 0 || $accessTokenId <= 0) {
            return false;
        }

        return Cache::lock($this->lockKey($challengeId), 10)->get(function () use ($challengeId, $userId, $accessTokenId): bool {
            $payload = Cache::get($this->recordKey($challengeId));

            if (! is_array($payload)) {
                return false;
            }

            if (($payload['intent'] ?? null) !== self::INTENT) {
                return false;
            }

            if (($payload['user_id'] ?? null) !== $userId) {
                return false;
            }

            if (($payload['access_token_id'] ?? null) !== $accessTokenId) {
                return false;
            }

            if (($payload['invalidated_at'] ?? null) !== null) {
                return false;
            }

            if (($payload['consumed_at'] ?? null) !== null) {
                return false;
            }

            if (($payload['verified_at'] ?? null) === null) {
                return false;
            }

            $expiresAt = $this->expiresAt($payload);

            if ($expiresAt === null || Carbon::now('UTC')->greaterThanOrEqualTo($expiresAt)) {
                return false;
            }

            // Ensure we can rewrite with a valid cache-retention expiry.
            $cacheExpiresAt = $this->cacheExpiresAt($payload);
            if (! $cacheExpiresAt instanceof Carbon) {
                return false;
            }

            $payload['consumed_at'] = $this->serializeDate(Carbon::now('UTC'));
            Cache::put($this->recordKey($challengeId), $payload, $cacheExpiresAt);

            return true;
        });
    }

    private function guardPersistentCache(): void
    {
        if (config('cache.default') === 'array') {
            throw new RuntimeException('Account deletion reauth challenges require a persistent cache store.');
        }
    }

    private function normalizeProvider(string $provider): string
    {
        $provider = strtolower(trim($provider));

        if (! in_array($provider, ['google', 'github'], true)) {
            throw new InvalidArgumentException('Unsupported provider.');
        }

        return $provider;
    }

    private function isWellFormedChallenge(string $challengeId): bool
    {
        return $this->isWellFormedToken($challengeId);
    }

    private function isWellFormedToken(string $token): bool
    {
        return preg_match('/\A[a-f0-9]{64}\z/', $token) === 1;
    }

    private function latestKey(int $userId, int $accessTokenId): string
    {
        return self::CACHE_PREFIX.':latest:'.$userId.':'.$accessTokenId;
    }

    private function recordKey(string $challengeId): string
    {
        return self::CACHE_PREFIX.':challenge:'.hash('sha256', $challengeId);
    }

    private function lockKey(string $challengeId): string
    {
        return self::CACHE_PREFIX.':lock:'.hash('sha256', $challengeId);
    }

    private function stateKey(string $state): string
    {
        return self::CACHE_PREFIX.':state:'.hash('sha256', $state);
    }

    private function expiresAt(array $record): ?Carbon
    {
        if (! isset($record['expires_at']) || ! is_string($record['expires_at'])) {
            return null;
        }

        try {
            return Carbon::parse($record['expires_at'])->utc();
        } catch (\Throwable) {
            return null;
        }
    }

    private function cacheExpiresAt(array $record): Carbon
    {
        if (isset($record['cache_expires_at']) && is_string($record['cache_expires_at'])) {
            try {
                return Carbon::parse($record['cache_expires_at'])->utc();
            } catch (\Throwable) {
                // Fall through to a conservative retention window for legacy records.
            }
        }

        return Carbon::now('UTC')->addSeconds(self::RETENTION_SECONDS);
    }

    private function serializeDate(Carbon $date): string
    {
        return $date->copy()->utc()->toIso8601ZuluString();
    }
}

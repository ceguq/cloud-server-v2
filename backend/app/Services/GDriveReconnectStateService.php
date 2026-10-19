<?php

namespace App\Services;

use App\Models\GDriveAccount;
use App\Models\User;
use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Support\Facades\Cache;
use RuntimeException;

class GDriveReconnectStateService
{
    private const PREFIX = 'gdrive-reconnect-v1-';

    private const CACHE_PREFIX = 'gdrive_reconnect_state';

    private const TTL_SECONDS = 600;

    public function issue(User $user, GDriveAccount $account): string
    {
        $this->guardPersistentCache();

        for ($attempt = 0; $attempt < 3; $attempt++) {
            $state = self::PREFIX.bin2hex(random_bytes(32));
            $stored = Cache::add(
                $this->stateKey($state),
                [
                    'user_id' => (string) $user->getKey(),
                    'account_id' => (string) $account->getKey(),
                    'issued_at' => now()->timestamp,
                ],
                self::TTL_SECONDS,
            );

            if ($stored) {
                return $state;
            }
        }

        throw new RuntimeException('Unable to issue a Google Drive reconnect state.');
    }

    public function isReconnectState(mixed $state): bool
    {
        return is_string($state)
            && preg_match('/\A'.preg_quote(self::PREFIX, '/').'[a-f0-9]{64}\z/', $state) === 1;
    }

    /**
     * @return array{user_id: string, account_id: string, created_at: int}|null
     */
    public function consume(string $state): ?array
    {
        $this->guardPersistentCache();

        if (! $this->isReconnectState($state)) {
            return null;
        }

        $stateKey = $this->stateKey($state);

        try {
            return Cache::lock($this->lockKey($state), 10)
                ->block(3, function () use ($stateKey): ?array {
                    $payload = Cache::get($stateKey);

                    if (! $this->isValidPayload($payload)) {
                        return null;
                    }

                    Cache::forget($stateKey);

                    return [
                        'user_id' => $payload['user_id'],
                        'account_id' => $payload['account_id'],
                        'created_at' => $payload['issued_at'],
                    ];
                });
        } catch (LockTimeoutException $exception) {
            throw new RuntimeException(
                'Unable to consume the Google Drive reconnect state.',
                previous: $exception,
            );
        }
    }

    private function guardPersistentCache(): void
    {
        if (config('cache.default') === 'array') {
            throw new RuntimeException('Google Drive reconnect states require a persistent cache store.');
        }
    }

    private function isValidPayload(mixed $payload): bool
    {
        if (! is_array($payload)) {
            return false;
        }

        $userId = $payload['user_id'] ?? null;
        $accountId = $payload['account_id'] ?? null;
        $issuedAt = $payload['issued_at'] ?? null;

        if (
            ! is_string($userId)
            || $userId === ''
            || ! is_string($accountId)
            || $accountId === ''
            || filter_var($issuedAt, FILTER_VALIDATE_INT) === false
        ) {
            return false;
        }

        $issuedAt = (int) $issuedAt;
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

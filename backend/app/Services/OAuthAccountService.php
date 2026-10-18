<?php

namespace App\Services;

use App\Models\OAuthIdentity;
use App\Models\User;
use DomainException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;
use RuntimeException;

class OAuthAccountService
{
    private const ALLOWED_PROVIDERS = [
        'google',
        'github',
    ];

    public function resolveOrCreate(
        string $provider,
        string $providerUserId,
        string $email,
        bool $emailVerified,
        ?string $name = null,
        ?string $avatarUrl = null,
    ): User {
        $provider = strtolower(trim($provider));

        if (! in_array($provider, self::ALLOWED_PROVIDERS, true)) {
            throw new InvalidArgumentException('Unsupported OAuth provider.');
        }

        $providerUserId = trim($providerUserId);

        if ($providerUserId === '') {
            throw new InvalidArgumentException('Invalid OAuth provider user identifier.');
        }

        if ($emailVerified !== true) {
            throw new InvalidArgumentException('Email must be verified.');
        }

        $email = strtolower(trim($email));

        if (filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            throw new InvalidArgumentException('Invalid email.');
        }

        $normalizedName = $this->normalizeName($name, $email);
        $normalizedAvatarUrl = $this->normalizeAvatarUrl($avatarUrl);

        return DB::transaction(function () use (
            $provider,
            $providerUserId,
            $email,
            $normalizedName,
            $normalizedAvatarUrl
        ) {
            $identity = OAuthIdentity::query()
                ->where('provider', $provider)
                ->where('provider_user_id', $providerUserId)
                ->lockForUpdate()
                ->first();

            if ($identity !== null) {
                $user = User::query()->find($identity->user_id);

                if ($user === null) {
                    throw new RuntimeException('OAuth identity is linked to a missing local user.');
                }

                $this->updateIdentityMetadata($identity, $email, $normalizedAvatarUrl);

                return $user;
            }

            $user = User::query()
                ->whereRaw('LOWER(email) = ?', [$email])
                ->lockForUpdate()
                ->first();

            if ($user !== null) {
                $conflictingIdentity = OAuthIdentity::query()
                    ->where('user_id', $user->getKey())
                    ->where('provider', $provider)
                    ->lockForUpdate()
                    ->first();

                if (
                    $conflictingIdentity !== null
                    && $conflictingIdentity->provider_user_id !== $providerUserId
                ) {
                    throw new DomainException('This email is already linked to a different OAuth account.');
                }

                if ($conflictingIdentity !== null) {
                    $this->updateIdentityMetadata($conflictingIdentity, $email, $normalizedAvatarUrl);

                    return $user;
                }
            }

            if ($user === null) {
                $user = new User;
                $user->name = $normalizedName;
                $user->email = $email;
                $user->password = null;
                $user->email_verified_at = now();
                $user->role = User::ROLE_USER;
                $user->save();
            }

            $identity = new OAuthIdentity;
            $identity->user_id = $user->getKey();
            $identity->provider = $provider;
            $identity->provider_user_id = $providerUserId;
            $identity->provider_email = $email;
            $identity->avatar_url = $normalizedAvatarUrl;
            $identity->save();

            return $user;
        });
    }

    public function linkIdentity(
        User $user,
        string $provider,
        string $providerUserId,
        string $email,
        bool $emailVerified,
        ?string $avatarUrl = null,
    ): void {
        $provider = strtolower(trim($provider));

        if (! in_array($provider, self::ALLOWED_PROVIDERS, true)) {
            throw new InvalidArgumentException('Unsupported OAuth provider.');
        }

        $providerUserId = trim($providerUserId);

        if ($providerUserId === '') {
            throw new InvalidArgumentException('Invalid OAuth provider user identifier.');
        }

        if (! $emailVerified) {
            throw new InvalidArgumentException('Email must be verified.');
        }

        $email = strtolower(trim($email));

        if (filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            throw new InvalidArgumentException('Invalid email.');
        }

        $normalizedAvatarUrl = $this->normalizeAvatarUrl($avatarUrl);

        DB::transaction(function () use (
            $user,
            $provider,
            $providerUserId,
            $email,
            $normalizedAvatarUrl,
        ): void {
            $lockedUser = User::query()
                ->whereKey($user->getKey())
                ->lockForUpdate()
                ->first();

            if ($lockedUser === null) {
                throw new RuntimeException('The account to link no longer exists.');
            }

            $identity = OAuthIdentity::query()
                ->where('provider', $provider)
                ->where('provider_user_id', $providerUserId)
                ->lockForUpdate()
                ->first();

            if ($identity !== null) {
                if ((string) $identity->user_id !== (string) $lockedUser->getKey()) {
                    throw new DomainException('This OAuth identity is linked to another account.');
                }

                $this->updateIdentityMetadata($identity, $email, $normalizedAvatarUrl);

                return;
            }

            $existingProviderIdentity = OAuthIdentity::query()
                ->where('user_id', $lockedUser->getKey())
                ->where('provider', $provider)
                ->lockForUpdate()
                ->first();

            if ($existingProviderIdentity !== null) {
                throw new DomainException('A different account for this provider is already linked.');
            }

            $lockedUser->oauthIdentities()->create([
                'provider' => $provider,
                'provider_user_id' => $providerUserId,
                'provider_email' => $email,
                'avatar_url' => $normalizedAvatarUrl,
            ]);
        });
    }

    /**
     * @return list<string>
     */
    public function unlinkProvider(User $user, string $provider): array
    {
        $provider = strtolower(trim($provider));

        if (! in_array($provider, self::ALLOWED_PROVIDERS, true)) {
            throw new InvalidArgumentException('Unsupported OAuth provider.');
        }

        return DB::transaction(function () use ($user, $provider): array {
            $lockedUser = User::query()
                ->whereKey($user->getKey())
                ->lockForUpdate()
                ->first();

            if ($lockedUser === null) {
                throw new RuntimeException('The account to update no longer exists.');
            }

            $identities = $lockedUser->oauthIdentities()
                ->whereIn('provider', self::ALLOWED_PROVIDERS)
                ->lockForUpdate()
                ->get();

            $identityToRemove = $identities->firstWhere('provider', $provider);

            if ($identityToRemove !== null) {
                $hasAnotherOAuthProvider = $identities->contains(
                    fn (OAuthIdentity $identity): bool => $identity->provider !== $provider,
                );

                if (! filled($lockedUser->password) && ! $hasAnotherOAuthProvider) {
                    throw new DomainException(
                        'Cannot disconnect the last login method. Add a local password or another connected provider first.',
                    );
                }

                $identityToRemove->delete();
            }

            return $lockedUser->oauthIdentities()
                ->whereIn('provider', self::ALLOWED_PROVIDERS)
                ->orderBy('provider')
                ->pluck('provider')
                ->all();
        });
    }

    private function updateIdentityMetadata(
        OAuthIdentity $identity,
        string $email,
        ?string $avatarUrl,
    ): void {
        $identity->fill([
            'provider_email' => $email,
            'avatar_url' => $avatarUrl,
        ]);

        if ($identity->isDirty()) {
            $identity->save();
        }
    }

    private function normalizeName(?string $name, string $email): string
    {
        if (is_string($name)) {
            $name = trim($name);
        }

        if (! is_string($name) || $name === '') {
            $fallback = explode('@', $email)[0] ?? '';
            $name = trim($fallback);

            if ($name === '') {
                $name = 'NimbusDrive User';
            }
        }

        return Str::limit($name, 255);
    }

    private function normalizeAvatarUrl(?string $avatarUrl): ?string
    {
        if (is_string($avatarUrl)) {
            $avatarUrl = trim($avatarUrl);

            if ($avatarUrl === '') {
                return null;
            }

            return $avatarUrl;
        }

        return $avatarUrl;
    }
}

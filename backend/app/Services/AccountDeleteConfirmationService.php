<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Hash;

final class AccountDeleteConfirmationService
{
    public function __construct(
        private readonly AccountDeleteReauthService $reauthService,
    ) {}

    /**
     * @param  array<string, mixed>  $confirmation
     */
    public function confirm(
        User $user,
        array $confirmation,
        ?int $accessTokenId = null,
    ): bool {
        if (($confirmation['confirm_delete'] ?? null) !== true) {
            return false;
        }

        $email = $confirmation['email'] ?? null;
        if (! is_string($email)
            || strtolower(trim($email)) !== strtolower(trim((string) $user->email))) {
            return false;
        }

        if ($user->password !== null) {
            $password = $confirmation['current_password'] ?? null;

            return is_string($password)
                && $password !== ''
                && Hash::check($password, $user->password);
        }

        if (! $user->oauthIdentities()->exists()
            || ! is_int($accessTokenId)
            || $accessTokenId <= 0) {
            return false;
        }

        $challengeId = $confirmation['challenge_id'] ?? null;
        if (! is_string($challengeId)
            || $this->reauthService->status(
                challengeId: $challengeId,
                userId: (int) $user->getKey(),
                accessTokenId: $accessTokenId,
            ) !== 'verified') {
            return false;
        }

        return $this->reauthService->consume(
            challengeId: $challengeId,
            userId: (int) $user->getKey(),
            accessTokenId: $accessTokenId,
        );
    }
}

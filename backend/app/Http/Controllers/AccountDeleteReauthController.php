<?php

namespace App\Http\Controllers;

use App\Services\AccountDeleteReauthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Laravel\Socialite\Facades\Socialite;

class AccountDeleteReauthController extends Controller
{
    public function __construct(
        private readonly AccountDeleteReauthService $reauthService,
    ) {}

    public function start(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'string', 'email', 'max:255'],
            'provider' => [
                'required',
                'string',
                Rule::in(['google', 'github']),
            ],
        ]);

        $email = strtolower(trim($validated['email']));
        $provider = strtolower(trim($validated['provider']));

        $user = $request->user();

        if (! $user) {
            throw ValidationException::withMessages([
                'reauth' => [
                    'Unable to start OAuth re-verification.',
                ],
            ]);
        }

        if (filled($user->password)) {
            throw ValidationException::withMessages([
                'provider' => [
                    'OAuth re-verification is only required for accounts without a local password.',
                ],
            ]);
        }

        if ($email !== strtolower(trim((string) $user->email))) {
            throw ValidationException::withMessages([
                'email' => [
                    'The email must match the authenticated account.',
                ],
            ]);
        }

        $identity = $user->oauthIdentities()
            ->get()
            ->first(
                fn ($identity) => strtolower(trim((string) $identity->provider)) === $provider
            );

        if (! $identity || trim((string) $identity->provider_user_id) === '') {
            throw ValidationException::withMessages([
                'provider' => [
                    'The selected OAuth provider is not connected to this account.',
                ],
            ]);
        }

        $currentAccessToken = $user->currentAccessToken();

        $accessTokenId =
            is_object($currentAccessToken)
            && method_exists($currentAccessToken, 'getKey')
                ? (int) $currentAccessToken->getKey()
                : 0;

        if ($accessTokenId <= 0) {
            throw ValidationException::withMessages([
                'reauth' => [
                    'Unable to resolve the current authentication token.',
                ],
            ]);
        }

        $issued = $this->reauthService->issue(
            userId: (int) $user->id,
            accessTokenId: $accessTokenId,
            provider: $provider,
            providerUserId: trim((string) $identity->provider_user_id),
        );

        $driver = Socialite::driver($provider)->stateless();

        if ($provider === 'github') {
            $driver->scopes(['user:email']);
        }

        $callbackRoute = $provider === 'google'
            ? 'delete-reauth.google.callback'
            : 'delete-reauth.github.callback';

        $driver->redirectUrl(route($callbackRoute));

        $authorizationUrl = $driver
            ->with([
                'state' => $issued['state'],
            ])
            ->redirect()
            ->getTargetUrl();

        return response()->json([
            'challenge' => $issued['challenge'],
            'authorization_url' => $authorizationUrl,
            'expires_at' => $issued['expires_at'],
        ]);
    }

    public function status(
        Request $request,
        string $challenge,
    ): JsonResponse {
        $user = $request->user();

        if (! $user) {
            return response()->json(['status' => 'invalid']);
        }

        $currentAccessToken = $user->currentAccessToken();

        $accessTokenId =
            is_object($currentAccessToken)
            && method_exists($currentAccessToken, 'getKey')
                ? (int) $currentAccessToken->getKey()
                : 0;

        if ($accessTokenId <= 0) {
            return response()->json(['status' => 'invalid']);
        }

        $status = $this->reauthService->status(
            challengeId: $challenge,
            userId: (int) $user->id,
            accessTokenId: $accessTokenId,
        );

        return response()->json([
            'status' => $status,
        ]);
    }
}

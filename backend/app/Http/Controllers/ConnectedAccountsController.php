<?php

namespace App\Http\Controllers;

use App\Services\OAuthAccountService;
use App\Services\OAuthLinkStateService;
use DomainException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Laravel\Socialite\Facades\Socialite;

class ConnectedAccountsController extends Controller
{
    public function __construct(
        private readonly OAuthAccountService $oauthAccountService,
        private readonly OAuthLinkStateService $oauthLinkStateService,
    ) {}

    public function start(Request $request, string $provider): JsonResponse
    {
        $validated = validator(
            ['provider' => $provider],
            ['provider' => ['required', 'string', Rule::in(['google', 'github'])]],
        )->validate();
        $provider = $validated['provider'];
        $user = $request->user();

        if ($user->oauthIdentities()->where('provider', $provider)->exists()) {
            return response()->json([
                'message' => 'This provider is already connected to your account.',
            ], 409);
        }

        $state = $this->oauthLinkStateService->issue($user, $provider);
        $driver = $this->providerDriver($provider);

        $authorizationUrl = $driver
            ->with(['state' => $state])
            ->redirect()
            ->getTargetUrl();

        return response()->json([
            'authorization_url' => $authorizationUrl,
        ]);
    }

    public function unlink(Request $request, string $provider): JsonResponse
    {
        $validated = validator(
            ['provider' => $provider],
            ['provider' => ['required', 'string', Rule::in(['google', 'github'])]],
        )->validate();

        try {
            $connectedProviders = $this->oauthAccountService->unlinkProvider(
                $request->user(),
                $validated['provider'],
            );
        } catch (DomainException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
            ], 422);
        }

        return response()->json([
            'message' => 'Provider disconnected.',
            'user' => [
                'has_local_password' => filled($request->user()->password),
                'connected_providers' => $connectedProviders,
            ],
        ]);
    }

    private function providerDriver(string $provider): object
    {
        $driver = Socialite::driver($provider)->stateless();

        if ($provider === 'github') {
            $driver->scopes(['user:email']);
        }

        return $driver;
    }
}

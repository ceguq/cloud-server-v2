<?php

namespace App\Http\Controllers;

use App\Services\AccountDeleteReauthService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Laravel\Socialite\Facades\Socialite;
use Throwable;

class AccountDeleteReauthCallbackController extends Controller
{
    public function __construct(
        private readonly AccountDeleteReauthService $accountDeleteReauthService,
    ) {}

    public function google(Request $request): RedirectResponse
    {
        return $this->callback($request, 'google');
    }

    public function github(Request $request): RedirectResponse
    {
        return $this->callback($request, 'github');
    }

    private function callback(Request $request, string $provider): RedirectResponse
    {
        if (! in_array($provider, ['google', 'github'], true)) {
            return $this->frontendFailureRedirect();
        }

        try {
            $state = $request->query('state');

            if (! is_string($state) || trim($state) === '') {
                return $this->frontendFailureRedirect();
            }

            $callbackRoute = $provider === 'google'
                ? 'delete-reauth.google.callback'
                : 'delete-reauth.github.callback';

            $driver = Socialite::driver($provider)->stateless();
            $driver->redirectUrl(route($callbackRoute));

            $providerUser = $driver->user();
            $providerUserId = $this->normalizeProviderUserId($providerUser->getId());

            if ($providerUserId === null) {
                return $this->frontendFailureRedirect();
            }

            $verified = $this->accountDeleteReauthService->verify(
                $state,
                $provider,
                $providerUserId,
            );

            return $verified
                ? $this->frontendSuccessRedirect()
                : $this->frontendFailureRedirect();
        } catch (Throwable) {
            return $this->frontendFailureRedirect();
        }
    }

    private function normalizeProviderUserId(mixed $providerUserId): ?string
    {
        if (! is_string($providerUserId) && ! is_int($providerUserId)) {
            return null;
        }

        $providerUserId = trim((string) $providerUserId);

        if ($providerUserId === '') {
            return null;
        }

        return $providerUserId;
    }

    private function rtrimFrontendUrl(): string
    {
        return rtrim((string) config('app.frontend_url'), '/');
    }

    private function frontendSuccessRedirect(): RedirectResponse
    {
        return redirect()->away(
            $this->rtrimFrontendUrl().'/settings?delete_reauth=success',
        );
    }

    private function frontendFailureRedirect(): RedirectResponse
    {
        return redirect()->away(
            $this->rtrimFrontendUrl().'/settings?delete_reauth=failed',
        );
    }
}

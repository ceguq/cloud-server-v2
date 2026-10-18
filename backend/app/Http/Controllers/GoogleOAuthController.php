<?php

namespace App\Http\Controllers;

use App\Services\OAuthAccountService;
use App\Services\OAuthExchangeService;
use DomainException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\InvalidStateException;
use RuntimeException;
use Throwable;

class GoogleOAuthController extends Controller
{
    public function __construct(
        private readonly OAuthAccountService $oauthAccountService,
        private readonly OAuthExchangeService $oauthExchangeService,
    ) {}

    public function redirect(): RedirectResponse
    {
        return Socialite::driver('google')->redirect();
    }

    public function callback(Request $request): RedirectResponse
    {
if ($request->filled('error')) {
            return $this->frontendRedirect([
                'error' => 'oauth_cancelled',
            ]);
        }

        try {
            $googleUser = Socialite::driver('google')->user();

            $providerUserId = $googleUser->getId();
            $email = $googleUser->getEmail();
            $name = $googleUser->getName();
            $avatarUrl = $googleUser->getAvatar();

            if (! is_string($providerUserId) || $providerUserId === '' || ! is_string($email) || $email === '') {
                throw new InvalidArgumentException('Invalid Google account data.');
            }

            $rawUser = $googleUser->user;

            $emailVerified = filter_var(
                $rawUser['verified_email']
                    ?? $rawUser['email_verified']
                    ?? false,
                FILTER_VALIDATE_BOOLEAN,
            );

            $emailVerified = $emailVerified === true;

            $user = $this->oauthAccountService->resolveOrCreate(
                provider: 'google',
                providerUserId: $providerUserId,
                email: $email,
                emailVerified: $emailVerified,
                name: is_string($name) ? $name : null,
                avatarUrl: is_string($avatarUrl) ? $avatarUrl : null,
            );

            $exchangeCode = $this->oauthExchangeService->issue(
                $user,
                'google',
            );

            return $this->frontendRedirect([
                'code' => $exchangeCode,
            ]);
        } catch (InvalidStateException) {
            return $this->frontendRedirect([
                'error' => 'oauth_state_invalid',
            ]);
        } catch (DomainException) {
            return $this->frontendRedirect([
                'error' => 'oauth_account_conflict',
            ]);
        } catch (InvalidArgumentException) {
            return $this->frontendRedirect([
                'error' => 'oauth_email_unavailable',
            ]);
        } catch (RuntimeException) {
            return $this->frontendRedirect([
                'error' => 'oauth_temporarily_unavailable',
            ]);
        } catch (Throwable) {
            return $this->frontendRedirect([
                'error' => 'oauth_failed',
            ]);
        }
    }

    private function frontendRedirect(array $query): RedirectResponse
    {
        $frontendUrl = config('app.frontend_url');

        if (! is_string($frontendUrl) || trim($frontendUrl) === '') {
            throw new RuntimeException('Missing frontend URL.');
        }

        $frontendUrl = rtrim($frontendUrl, '/');

        $url = $frontendUrl.'/auth/oauth/callback';

        if ($query !== []) {
            $url .= '?'.http_build_query($query, '', '&', PHP_QUERY_RFC3986);
        }

        return redirect()->away($url);
    }
}

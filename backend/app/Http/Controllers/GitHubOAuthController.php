<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\OAuthAccountService;
use App\Services\OAuthExchangeService;
use App\Services\OAuthLinkStateService;
use DomainException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use InvalidArgumentException;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\InvalidStateException;
use RuntimeException;
use Throwable;

class GitHubOAuthController extends Controller
{
    public function __construct(
        private readonly OAuthAccountService $oauthAccountService,
        private readonly OAuthExchangeService $oauthExchangeService,
        private readonly OAuthLinkStateService $oauthLinkStateService,
    ) {}

    public function redirect(): RedirectResponse
    {
        return Socialite::driver('github')
            ->scopes(['user:email'])
            ->redirect();
    }

    public function callback(Request $request): RedirectResponse
    {
        $state = $request->query('state');

        if ($this->oauthLinkStateService->isLinkState($state)) {
            return $this->linkCallback($request, $state);
        }

        if ($request->filled('error')) {
            return $this->frontendRedirect([
                'error' => 'oauth_cancelled',
            ]);
        }

        try {
            $githubUser = Socialite::driver('github')->user();

            $rawProviderUserId = $githubUser->getId();

            $providerUserId = is_string($rawProviderUserId)
                || is_int($rawProviderUserId)
                    ? trim((string) $rawProviderUserId)
                    : '';

            $email = $this->resolveVerifiedEmail($githubUser);

            $name = $githubUser->getName();
            $nickname = $githubUser->getNickname();
            $avatarUrl = $githubUser->getAvatar();

            if ($providerUserId === '' || $email === null) {
                throw new InvalidArgumentException(
                    'GitHub login identity is incomplete.',
                );
            }

            $resolvedName = is_string($name) && trim($name) !== ''
                ? trim($name)
                : (
                    is_string($nickname) && trim($nickname) !== ''
                        ? trim($nickname)
                        : null
                );

            $user = $this->oauthAccountService->resolveOrCreate(
                provider: 'github',
                providerUserId: $providerUserId,
                email: $email,
                emailVerified: true,
                name: $resolvedName,
                avatarUrl: is_string($avatarUrl)
                    && trim($avatarUrl) !== ''
                        ? trim($avatarUrl)
                        : null,
            );

            $exchangeCode = $this->oauthExchangeService->issue(
                $user,
                'github',
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

    private function linkCallback(Request $request, string $state): RedirectResponse
    {
        try {
            $intent = $this->oauthLinkStateService->consume($state, 'github');

            if ($intent === null) {
                return $this->settingsRedirect('oauth_state_invalid');
            }

            if ($request->filled('error')) {
                return $this->settingsRedirect('oauth_cancelled');
            }

            $githubUser = Socialite::driver('github')->stateless()->user();
            $rawProviderUserId = $githubUser->getId();
            $providerUserId = is_string($rawProviderUserId) || is_int($rawProviderUserId)
                ? trim((string) $rawProviderUserId)
                : '';
            $email = $this->resolveVerifiedEmail($githubUser);
            $avatarUrl = $githubUser->getAvatar();

            if ($providerUserId === '' || $email === null) {
                throw new InvalidArgumentException('GitHub account data is incomplete.');
            }

            $user = User::query()->find($intent['user_id']);

            if ($user === null) {
                return $this->settingsRedirect('oauth_state_invalid');
            }

            $this->oauthAccountService->linkIdentity(
                user: $user,
                provider: 'github',
                providerUserId: $providerUserId,
                email: $email,
                emailVerified: true,
                avatarUrl: is_string($avatarUrl) && trim($avatarUrl) !== ''
                    ? trim($avatarUrl)
                    : null,
            );

            return $this->settingsRedirect(null, 'github');
        } catch (DomainException) {
            return $this->settingsRedirect('oauth_link_conflict');
        } catch (InvalidArgumentException) {
            return $this->settingsRedirect('oauth_email_unavailable');
        } catch (RuntimeException) {
            return $this->settingsRedirect('oauth_temporarily_unavailable');
        } catch (Throwable) {
            return $this->settingsRedirect('oauth_link_failed');
        }
    }

    private function resolveVerifiedEmail(mixed $githubUser): ?string
    {
        $profileEmail = $this->normalizeEmail(
            $githubUser->getEmail(),
        );

        if ($profileEmail !== null) {
            return $profileEmail;
        }

        $token = $githubUser->token ?? null;

        if (! is_string($token) || trim($token) === '') {
            return null;
        }

        try {
            $response = Http::acceptJson()
                ->withToken(trim($token))
                ->withHeaders([
                    'X-GitHub-Api-Version' => '2022-11-28',
                    'User-Agent' => 'Cenimbox',
                ])
                ->timeout(10)
                ->get('https://api.github.com/user/emails');
        } catch (Throwable) {
            return null;
        }

        if (! $response->successful()) {
            return null;
        }

        $emailEntries = $response->json();

        if (! is_array($emailEntries)) {
            return null;
        }

        foreach ($emailEntries as $entry) {
            if (
                ! is_array($entry)
                || ($entry['verified'] ?? null) !== true
                || ($entry['primary'] ?? null) !== true
            ) {
                continue;
            }

            $email = $this->normalizeEmail(
                $entry['email'] ?? null,
            );

            if ($email !== null) {
                return $email;
            }
        }

        foreach ($emailEntries as $entry) {
            if (
                ! is_array($entry)
                || ($entry['verified'] ?? null) !== true
            ) {
                continue;
            }

            $email = $this->normalizeEmail(
                $entry['email'] ?? null,
            );

            if ($email !== null) {
                return $email;
            }
        }

        return null;
    }

    private function normalizeEmail(mixed $email): ?string
    {
        if (! is_string($email)) {
            return null;
        }

        $email = strtolower(trim($email));

        if (
            $email === ''
            || filter_var($email, FILTER_VALIDATE_EMAIL) === false
        ) {
            return null;
        }

        return $email;
    }

    private function frontendRedirect(array $query): RedirectResponse
    {
        $frontendUrl = config('app.frontend_url');

        if (! is_string($frontendUrl) || trim($frontendUrl) === '') {
            throw new RuntimeException(
                'Frontend URL is not configured.',
            );
        }

        $frontendUrl = rtrim($frontendUrl, '/');

        $url = $frontendUrl.'/auth/oauth/callback';

        $url .= '?'.http_build_query(
            $query,
            '',
            '&',
            PHP_QUERY_RFC3986,
        );

        return redirect()->away($url);
    }

    private function settingsRedirect(?string $error, ?string $provider = null): RedirectResponse
    {
        $frontendUrl = config('app.frontend_url');

        if (! is_string($frontendUrl) || trim($frontendUrl) === '') {
            throw new RuntimeException(
                'Frontend URL is not configured.',
            );
        }

        $query = $error === null
            ? ['oauth_link' => 'success', 'provider' => $provider]
            : ['oauth_link' => 'failed', 'reason' => $error];

        return redirect()->away(
            rtrim($frontendUrl, '/').'/settings?'.http_build_query(
                $query,
                '',
                '&',
                PHP_QUERY_RFC3986,
            ),
        );
    }
}

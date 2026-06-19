<?php

namespace App\Services;

use App\Models\GDriveAccount;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class GoogleDriveService
{
    private const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

    private function config(): array
    {
        $clientId = config('services.google_drive.client_id');
        $clientSecret = config('services.google_drive.client_secret');
        $redirectUri = config('services.google_drive.redirect_uri');
        $scopes = config('services.google_drive.scopes', []);

        if (empty($clientId) || empty($clientSecret) || empty($redirectUri)) {
            throw new RuntimeException('Google Drive OAuth config missing (client_id/client_secret/redirect_uri).');
        }

        return [
            'client_id' => $clientId,
            'client_secret' => $clientSecret,
            'redirect_uri' => $redirectUri,
            'scopes' => $scopes,
        ];
    }

    public function exchangeAuthorizationCode(string $code): array
    {
        $config = $this->config();

        $response = Http::asForm()->post(self::TOKEN_ENDPOINT, [
            'code' => $code,
            'client_id' => $config['client_id'],
            'client_secret' => $config['client_secret'],
            'redirect_uri' => $config['redirect_uri'],
            'grant_type' => 'authorization_code',
        ])->throw()->json();

        return is_array($response) ? $response : [];
    }

    public function refreshAccessToken(GDriveAccount $account): GDriveAccount
    {
        if (empty($account->refresh_token)) {
            throw new RuntimeException('Google Drive refresh_token is missing.');
        }

        $config = $this->config();

        $response = Http::asForm()->post(self::TOKEN_ENDPOINT, [
            'client_id' => $config['client_id'],
            'client_secret' => $config['client_secret'],
            'refresh_token' => $account->refresh_token,
            'grant_type' => 'refresh_token',
        ])->throw()->json();

        $accessToken = $response['access_token'] ?? null;
        if (empty($accessToken)) {
            throw new RuntimeException('Google Drive refresh token did not return access_token.');
        }

        $account->access_token = $accessToken;
        $account->token_expires_at = now()->addSeconds((int) ($response['expires_in'] ?? 3600));

        $scope = $response['scope'] ?? null;
        if (!empty($scope) && is_string($scope)) {
            $account->scopes = explode(' ', $scope);
        }

        $account->save();

        return $account->fresh() ?? $account;
    }

    public function shouldRefresh(GDriveAccount $account): bool
    {
        $expiresAt = $account->token_expires_at;
        if (empty($account->access_token) || empty($expiresAt)) {
            return true;
        }

        $expiresAt = $expiresAt instanceof Carbon ? $expiresAt : Carbon::parse($expiresAt);

        return $expiresAt->lessThanOrEqualTo(now()->addMinutes(5));
    }

    public function ensureFreshAccessToken(GDriveAccount $account): GDriveAccount
    {
        if (!$this->shouldRefresh($account)) {
            return $account;
        }

        return $this->refreshAccessToken($account);
    }
}


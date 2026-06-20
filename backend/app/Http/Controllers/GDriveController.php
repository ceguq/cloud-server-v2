<?php

namespace App\Http\Controllers;

use App\Models\GDriveAccount;
use App\Models\User;
use App\Services\GoogleDriveService;
use Illuminate\Http\Client\RequestException;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;






class GDriveController extends Controller
{
    public function index(Request $request, GoogleDriveService $googleDriveService): JsonResponse
    {
        $user = $request->user();

        $accounts = GDriveAccount::query()
            ->where('user_id', $user->id)
            ->orderByDesc('revoked_at')
            ->orderByDesc('connected_at')
            ->orderByDesc('created_at')
            ->get([
                'id',
                'label',
                'email',
                'google_account_id',
                'avatar_url',
                'access_token',
                'refresh_token',
                'token_expires_at',
                'scopes',
                'connected_at',
                'last_synced_at',
                'revoked_at',
                'created_at',
                'updated_at',
            ]);

        $data = $accounts->map(function (GDriveAccount $account) use ($googleDriveService) {
            $isRevoked = $account->revoked_at !== null;
            $storageQuota = null;

            if (! $isRevoked) {
                try {
                    $freshAccount = $googleDriveService->ensureFreshAccessToken($account);
                    $about = $googleDriveService->getAccountAbout((string) $freshAccount->access_token);
                    $quota = $about['storageQuota'] ?? null;

                    if (is_array($quota)) {
                        $storageQuota = [
                            'limit' => isset($quota['limit']) ? (string) $quota['limit'] : null,
                            'usage' => isset($quota['usage']) ? (string) $quota['usage'] : null,
                            'usage_in_drive' => isset($quota['usageInDrive']) ? (string) $quota['usageInDrive'] : null,
                            'usage_in_drive_trash' => isset($quota['usageInDriveTrash']) ? (string) $quota['usageInDriveTrash'] : null,
                        ];
                    }
                } catch (Throwable $e) {
                    $storageQuota = null;
                }
            }

            return [
                'id' => $account->id,
                'label' => $account->label,
                'email' => $account->email,
                'google_account_id' => $account->google_account_id,
                'avatar_url' => $account->avatar_url,
                'scopes' => $account->scopes,
                'token_expires_at' => $account->token_expires_at?->toISOString(),
                'connected_at' => $account->connected_at?->toISOString(),
                'last_synced_at' => $account->last_synced_at?->toISOString(),
                'revoked_at' => $account->revoked_at?->toISOString(),
                'created_at' => $account->created_at?->toISOString(),
                'updated_at' => $account->updated_at?->toISOString(),
                'status' => $isRevoked ? 'revoked' : 'connected',
                'is_connected' => !$isRevoked,
                'is_revoked' => $isRevoked,
                'storage_quota' => $storageQuota,
            ];
        });

        return response()->json(['data' => $data]);

    }

    public function connect(Request $request): RedirectResponse|JsonResponse
    {
        $clientId = config('services.google_drive.client_id');
        $redirectUri = config('services.google_drive.redirect_uri');
        $scopes = config('services.google_drive.scopes', []);

        if (empty($clientId) || empty($redirectUri)) {
            return response()->json([
                'message' => 'Google Drive OAuth config missing (client_id and/or redirect_uri).',
            ], 422);
        }

        $statePayload = [
            'user_id' => $request->user()->id,
            'nonce' => Str::random(40),
            'created_at' => now()->timestamp,
        ];

        $state = Crypt::encryptString(json_encode($statePayload));

        $query = http_build_query([
            'client_id' => $clientId,
            'redirect_uri' => $redirectUri,
            'response_type' => 'code',
            'scope' => implode(' ', $scopes),
            'access_type' => 'offline',
            'prompt' => 'consent',
            'include_granted_scopes' => 'true',
            'state' => $state,
        ]);


        $url = 'https://accounts.google.com/o/oauth2/v2/auth?' . $query;

        if ($request->expectsJson()) {
            return response()->json(['url' => $url]);
        }

        return redirect()->away($url);
    }

    public function callback(Request $request, GoogleDriveService $googleDriveService): JsonResponse
    {
        $code = $request->input('code');
        $state = $request->input('state');
        $error = $request->input('error');

        if ($error) {
            return response()->json([
                'message' => 'Google Drive OAuth callback error received: ' . $error,
            ], 400);
        }

        if (empty($state)) {
            return response()->json([
                'message' => 'Missing OAuth state.',
            ], 422);
        }

        if (empty($code)) {
            return response()->json([
                'message' => 'Missing OAuth code.',
            ], 422);
        }

        try {
            $statePayload = json_decode(Crypt::decryptString($state), true);
        } catch (Throwable $e) {
            return response()->json(['message' => 'Invalid Google Drive OAuth state.'], 400);
        }

        if (empty($statePayload['user_id']) || empty($statePayload['created_at'])) {
            return response()->json(['message' => 'Invalid Google Drive OAuth state payload.'], 400);
        }

        $createdAt = (int) ($statePayload['created_at'] ?? 0);
        if ($createdAt < now()->subMinutes(10)->timestamp) {
            return response()->json(['message' => 'Expired OAuth state.'], 400);
        }

        try {
            $tokenResponse = $googleDriveService->exchangeAuthorizationCode($code);

            $accessToken = $tokenResponse['access_token'] ?? null;
            if (empty($accessToken)) {
                return response()->json([
                    'message' => 'Failed to connect Google Drive account.',
                ], 502);
            }

            $about = $googleDriveService->getAccountAbout($accessToken);

            $driveUser = $about['user'] ?? [];
            $email = $driveUser['emailAddress'] ?? null;
            $displayName = $driveUser['displayName'] ?? null;
            $photoLink = $driveUser['photoLink'] ?? null;
            $permissionId = $driveUser['permissionId'] ?? null;

            if (empty($email)) {
                return response()->json([
                    'message' => 'Unable to read Google Drive account email.',
                ], 422);
            }

            $user = User::query()->find($statePayload['user_id']);
            if (!$user) {
                return response()->json(['message' => 'OAuth user not found.'], 404);
            }

            $account = null;
            if (!empty($permissionId)) {
                $account = GDriveAccount::query()
                    ->where('user_id', $user->id)
                    ->where('google_account_id', $permissionId)
                    ->first();
            }

            if (!$account) {
                $account = GDriveAccount::query()
                    ->where('user_id', $user->id)
                    ->where('email', $email)
                    ->first();
            }

            if (!$account) {
                $account = new GDriveAccount();
            }

            $incomingRefreshToken = $tokenResponse['refresh_token'] ?? null;

            if (empty($incomingRefreshToken) && !$account->exists) {
                return response()->json([
                    'message' => 'Google Drive refresh token was not returned. Please revoke access in Google account permissions and connect again.',
                ], 422);
            }

            $account->user_id = $user->id;
            $account->email = $email;
            $account->google_account_id = $permissionId;
            $account->avatar_url = $photoLink;
            $account->label = !empty($account->label) ? $account->label : ($displayName ?: $email);

            $account->access_token = $tokenResponse['access_token'];

            if (!empty($incomingRefreshToken)) {
                $account->refresh_token = $incomingRefreshToken;
            }

            $account->token_expires_at = now()->addSeconds((int) ($tokenResponse['expires_in'] ?? 3600));

            $scopes = config('services.google_drive.scopes', []);

            if (isset($tokenResponse['scope']) && is_string($tokenResponse['scope'])) {
                $scopes = array_values(array_filter(explode(' ', $tokenResponse['scope'])));
            }

            $account->scopes = $scopes;

            $account->connected_at = $account->connected_at ?: now();
            $account->revoked_at = null;

            $account->save();

            $payload = [
                'message' => 'Google Drive account connected.',
                'data' => [
                    'id' => $account->id,
                    'label' => $account->label,
                    'email' => $account->email,
                    'google_account_id' => $account->google_account_id,
                    'avatar_url' => $account->avatar_url,
                    'scopes' => $account->scopes,
                    'token_expires_at' => $account->token_expires_at?->toISOString(),
                    'connected_at' => $account->connected_at?->toISOString(),
                    'last_synced_at' => $account->last_synced_at?->toISOString(),
                    'revoked_at' => $account->revoked_at?->toISOString(),
                    'status' => 'connected',
                    'is_connected' => true,
                    'is_revoked' => false,
                ],
            ];

            if (! $request->expectsJson()) {
                $frontendUrl = rtrim((string) config('app.frontend_url', 'http://localhost:5173'), '/');

                return redirect()->away($frontendUrl . '/gdrive?gdrive=connected');
            }


            return response()->json($payload);


        } catch (Throwable $e) {
            $context = [
                'exception' => $e::class,
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ];

            if ($e instanceof RequestException && $e->response !== null) {
                $context['response_status'] = $e->response->status();
            }

            Log::error('Google Drive OAuth callback failed', $context);

            return response()->json([
                'message' => 'Failed to connect Google Drive account.',
            ], 502);

        }


    }

    public function allFiles(Request $request, GoogleDriveService $googleDriveService): JsonResponse
    {
        $user = $request->user();

        $accounts = GDriveAccount::query()
            ->where('user_id', $user->id)
            ->whereNull('revoked_at')
            ->orderByDesc('connected_at')
            ->orderByDesc('created_at')
            ->get();

        $pageSize = (int) $request->query('page_size', 25);
        $pageTokens = $request->query('page_tokens', []);

        if (! is_array($pageTokens)) {
            $pageTokens = [];
        }

        $files = collect();
        $nextPageTokens = [];
        $errors = [];

        foreach ($accounts as $account) {
            $pageToken = $pageTokens[$account->id] ?? null;

            try {
                $response = $googleDriveService->listFiles(
                    $account,
                    is_string($pageToken) ? $pageToken : null,
                    $pageSize
                );

                $mappedFiles = collect($response['files'] ?? [])->map(function (array $file) use ($account) {
                    $owner = $file['owners'][0] ?? [];

                    return [
                        'id' => $file['id'] ?? null,
                        'account_id' => $account->id,
                        'account_email' => $account->email,
                        'name' => $file['name'] ?? null,
                        'mime_type' => $file['mimeType'] ?? null,
                        'icon_link' => $file['iconLink'] ?? null,
                        'web_view_link' => $file['webViewLink'] ?? null,
                        'web_content_link' => $file['webContentLink'] ?? null,
                        'size' => $file['size'] ?? null,
                        'created_time' => $file['createdTime'] ?? null,
                        'modified_time' => $file['modifiedTime'] ?? null,
                        'shared' => $file['shared'] ?? null,
                        'starred' => $file['starred'] ?? null,
                        'owner_name' => $owner['displayName'] ?? null,
                        'owner_email' => $owner['emailAddress'] ?? null,
                        'source' => 'gdrive',
                    ];
                });

                $files = $files->merge($mappedFiles);
                $nextPageTokens[$account->id] = $response['nextPageToken'] ?? null;
            } catch (Throwable $e) {
                $errors[] = [
                    'account_id' => $account->id,
                    'account_email' => $account->email,
                    'message' => 'Failed to load files for this Google Drive account.',
                ];
            }
        }

        return response()->json([
            'data' => $files,
            'meta' => [
                'account_count' => $accounts->count(),
                'next_page_tokens' => $nextPageTokens,
                'errors' => $errors,
            ],
        ]);
    }

    public function files(Request $request, GDriveAccount $account, GoogleDriveService $googleDriveService): JsonResponse
    {
        $user = $request->user();

        if ($account->user_id !== $user->id) {
            return response()->json([
                'message' => 'Google Drive account not found.',
            ], 404);
        }

        if ($account->revoked_at !== null) {
            return response()->json([
                'message' => 'Google Drive account is disconnected.',
            ], 422);
        }

        $pageToken = $request->query('page_token');
        $pageSize = (int) $request->query('page_size', 50);

        try {
            $response = $googleDriveService->listFiles(
                $account,
                is_string($pageToken) ? $pageToken : null,
                $pageSize
            );

            $files = collect($response['files'] ?? [])->map(function (array $file) use ($account) {
                $owner = $file['owners'][0] ?? [];

                return [
                    'id' => $file['id'] ?? null,
                    'account_id' => $account->id,
                    'account_email' => $account->email,
                    'name' => $file['name'] ?? null,
                    'mime_type' => $file['mimeType'] ?? null,
                    'icon_link' => $file['iconLink'] ?? null,
                    'web_view_link' => $file['webViewLink'] ?? null,
                    'web_content_link' => $file['webContentLink'] ?? null,
                    'size' => $file['size'] ?? null,
                    'created_time' => $file['createdTime'] ?? null,
                    'modified_time' => $file['modifiedTime'] ?? null,
                    'shared' => $file['shared'] ?? null,
                    'starred' => $file['starred'] ?? null,
                    'owner_name' => $owner['displayName'] ?? null,
                    'owner_email' => $owner['emailAddress'] ?? null,
                    'source' => 'gdrive',
                ];
            });

            return response()->json([
                'data' => $files,
                'meta' => [
                    'account_id' => $account->id,
                    'account_email' => $account->email,
                    'next_page_token' => $response['nextPageToken'] ?? null,
                ],
            ]);
        } catch (Throwable $e) {
            return response()->json([
                'message' => 'Failed to load Google Drive files.',
            ], 502);
        }
    }

    public function destroy(Request $request, GDriveAccount $account, GoogleDriveService $googleDriveService): JsonResponse
    {
        $user = $request->user();
        if (!$user || $account->user_id !== $user->id) {
            return response()->json(['message' => 'Not found.'], 404);
        }

        $token = $account->refresh_token ?: $account->access_token;
        $googleRevoked = false;

        try {
            $googleRevoked = $googleDriveService->revokeToken($token);
        } catch (Throwable $e) {
            // best-effort revoke: swallow errors
            $googleRevoked = false;
        }

        $account->revoked_at = Carbon::now();

        // Optional safe cleanup (still keep behavior non-sensitive)
        $account->access_token = null;
        $account->refresh_token = null;

        $account->save();

        return response()->json([
            'message' => $googleRevoked
                ? 'Google Drive account disconnected. Google token revoked.'
                : 'Google Drive account disconnected locally. Google token revoke failed.',
            'google_revoked' => (bool) $googleRevoked,
            'data' => [
                'id' => $account->id,
                'email' => $account->email,
                'status' => 'revoked',
                'revoked_at' => $account->revoked_at?->toISOString(),
            ],
        ]);
    }
}



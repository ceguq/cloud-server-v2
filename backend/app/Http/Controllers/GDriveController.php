<?php

namespace App\Http\Controllers;

use App\Models\GDriveAccount;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Str;
use Throwable;


class GDriveController extends Controller
{
    public function index(Request $request): JsonResponse
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
                'token_expires_at',
                'scopes',
                'connected_at',
                'last_synced_at',
                'revoked_at',
                'created_at',
                'updated_at',
            ]);

        return response()->json(['data' => $accounts]);
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

        return redirect()->away($url);
    }

    public function callback(Request $request): JsonResponse
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

        return response()->json([
            'message' => 'Google Drive OAuth callback received. Token exchange is not implemented yet.',
            'has_code' => true,
            'user_id' => $statePayload['user_id'],
        ]);

    }

    public function destroy(Request $request, GDriveAccount $account): JsonResponse
    {
        $user = $request->user();
        if (!$user || $account->user_id !== $user->id) {
            return response()->json(['message' => 'Not found.'], 404);
        }

        $account->revoked_at = Carbon::now();
        $account->save();

        return response()->json([
            'message' => 'Google Drive account disconnected locally. Google token revoke is not implemented yet.',
        ]);
    }
}


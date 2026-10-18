<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;

class SessionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $currentToken = $user->currentAccessToken();
        $currentTokenId = $currentToken instanceof PersonalAccessToken
            ? $currentToken->getKey()
            : null;

        $sessions = $user->tokens()
            ->latest('created_at')
            ->get(['id', 'name', 'last_used_at', 'created_at', 'expires_at'])
            ->map(fn (PersonalAccessToken $token): array => [
                'id' => (string) $token->getKey(),
                'name' => $token->name,
                'is_current' => $currentTokenId !== null
                    && (string) $token->getKey() === (string) $currentTokenId,
                'last_used_at' => $token->last_used_at?->toISOString(),
                'created_at' => $token->created_at?->toISOString(),
                'expires_at' => $token->expires_at?->toISOString(),
            ]);

        return response()->json(['data' => $sessions]);
    }

    public function destroy(Request $request, string $session): JsonResponse
    {
        $token = $request->user()->tokens()
            ->whereKey($session)
            ->firstOrFail();

        $token->delete();

        return response()->json([
            'message' => 'Session revoked successfully.',
        ]);
    }

    public function destroyOtherSessions(Request $request): JsonResponse
    {
        $user = $request->user();
        $currentToken = $user->currentAccessToken();

        if (! $currentToken instanceof PersonalAccessToken) {
            return response()->json([
                'message' => 'The current token session could not be identified.',
            ], 409);
        }

        $revokedCount = $user->tokens()
            ->where('id', '!=', $currentToken->getKey())
            ->delete();

        return response()->json([
            'message' => 'Other sessions revoked successfully.',
            'revoked_count' => $revokedCount,
        ]);
    }
}

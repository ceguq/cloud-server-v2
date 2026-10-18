<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\DeviceTrackingService;
use App\Services\OAuthExchangeService;
use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

class OAuthExchangeController extends Controller
{
    public function __construct(
        private readonly OAuthExchangeService $oauthExchangeService,
        private readonly DeviceTrackingService $deviceTrackingService,
    ) {}

    public function exchange(Request $request): JsonResponse
    {

        $invalidResponse = response()->json([
            'message' => 'Kode login tidak valid atau sudah kedaluwarsa.',
        ], 422);

        $code = $request->input('code');

        if (! is_string($code)) {
            return $invalidResponse;
        }

        try {
            $payload = $this->oauthExchangeService->consume($code);
        } catch (LockTimeoutException|RuntimeException $e) {
            return response()->json([
                'message' => 'Layanan login sementara tidak tersedia. Silakan coba lagi.',
            ], 503);
        }

        if ($payload === null) {
            return $invalidResponse;
        }

        $user = User::query()->find($payload['user_id']);

        if ($user === null) {
            return $invalidResponse;
        }

        $token = $user->createToken('nimbusdrive-v2-token')->plainTextToken;

        $this->deviceTrackingService->trackLogin($request, $user);

        return response()->json([

            'message' => 'Login berhasil',
            'token' => $token,
            'user' => $user,
        ]);
    }
}

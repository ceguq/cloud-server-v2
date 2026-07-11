<?php

namespace App\Http\Controllers;

use App\Models\Device;
use App\Models\User;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;


class AuthController extends Controller
{
    public function login(Request $request, ActivityLogService $activityLogService): JsonResponse
    {

        $validated = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $validated['email'])->first();

        if (!$user || !Hash::check($validated['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Email atau password salah.'],
            ]);
        }

        $token = $user->createToken('nimbusdrive-v2-token')->plainTextToken;

        // Activity Log only for successful login
        $activityLogService->log(
            action: 'auth.login',
            description: 'Login berhasil',
            subject: $user,
            metadata: [
                'email' => $user->email,
            ],
            user: $user,
            request: $request
        );

        $this->trackLoginDevice($request, $user);

        return response()->json([
            'message' => 'Login berhasil',
            'token' => $token,
            'user' => $user,
        ]);

    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'user' => $request->user(),
        ]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        if (is_string($request->input('name'))) {
            $request->merge(['name' => trim($request->input('name'))]);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:255'],
        ]);

        $user = $request->user();
        $user->update([
            'name' => $validated['name'],
        ]);

        return response()->json([
            'message' => 'Profile updated successfully.',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
            ],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logout berhasil',
        ]);
    }

    private function trackLoginDevice(Request $request, User $user): void
    {
        try {
            $userAgent = $request->userAgent() ?? '';
            $normalizedUserAgent = $this->normalizeUserAgent($userAgent);
            $clientBrowser = $this->normalizeClientBrowser($request->input('client_browser'));
            $deviceInfo = $this->parseUserAgent($normalizedUserAgent, $clientBrowser);
            $normalizedBrowserName = strtolower($deviceInfo['browser']);
            $deviceHash = hash('sha256', $user->id . '|' . $normalizedUserAgent . '|' . $normalizedBrowserName);

            $device = Device::query()->firstOrNew([
                'user_id' => $user->id,
                'device_hash' => $deviceHash,
            ]);

            $device->fill([
                'display_name' => $deviceInfo['display_name'],
                'device_type' => $deviceInfo['device_type'],
                'platform' => $deviceInfo['platform'],
                'browser' => $deviceInfo['browser'],
                'ip_address' => $request->ip(),
                'user_agent' => $userAgent,
                'last_seen_at' => now(),
            ]);

            if (!$device->exists) {
                $device->trusted = false;
            }

            $device->save();
        } catch (\Throwable $exception) {
            report($exception);
        }
    }

    private function normalizeUserAgent(string $userAgent): string
    {
        return strtolower(trim((string) preg_replace('/\s+/', ' ', $userAgent)));
    }

    private function normalizeClientBrowser(mixed $clientBrowser): ?string
    {
        if (!is_string($clientBrowser)) {
            return null;
        }

        return match (trim($clientBrowser)) {
            'Brave' => 'Brave',
            default => null,
        };
    }

    private function parseUserAgent(string $normalizedUserAgent, ?string $clientBrowser = null): array
    {
        $deviceType = $this->detectDeviceType($normalizedUserAgent);
        $platform = $this->detectPlatform($normalizedUserAgent);
        $browser = $clientBrowser ?? $this->detectBrowser($normalizedUserAgent);

        return [
            'display_name' => "{$browser} on {$platform}",
            'device_type' => $deviceType,
            'platform' => $platform,
            'browser' => $browser,
        ];
    }

    private function detectDeviceType(string $userAgent): string
    {
        if ($userAgent === '') {
            return 'unknown';
        }

        if (str_contains($userAgent, 'ipad') || str_contains($userAgent, 'tablet')) {
            return 'tablet';
        }

        if (str_contains($userAgent, 'android') && !str_contains($userAgent, 'mobile')) {
            return 'tablet';
        }

        if (
            str_contains($userAgent, 'iphone') ||
            str_contains($userAgent, 'ipod') ||
            str_contains($userAgent, 'mobile')
        ) {
            return 'mobile';
        }

        if (
            str_contains($userAgent, 'windows') ||
            str_contains($userAgent, 'macintosh') ||
            str_contains($userAgent, 'mac os x') ||
            str_contains($userAgent, 'linux')
        ) {
            return 'desktop';
        }

        return 'unknown';
    }

    private function detectPlatform(string $userAgent): string
    {
        if (str_contains($userAgent, 'android')) {
            return 'Android';
        }

        if (
            str_contains($userAgent, 'iphone') ||
            str_contains($userAgent, 'ipad') ||
            str_contains($userAgent, 'ipod')
        ) {
            return 'iOS';
        }

        if (str_contains($userAgent, 'windows')) {
            return 'Windows';
        }

        if (str_contains($userAgent, 'macintosh') || str_contains($userAgent, 'mac os x')) {
            return 'macOS';
        }

        if (str_contains($userAgent, 'linux')) {
            return 'Linux';
        }

        return 'Unknown';
    }

    private function detectBrowser(string $userAgent): string
    {
        if (
            str_contains($userAgent, 'edg/') ||
            str_contains($userAgent, 'edge/') ||
            str_contains($userAgent, 'edgios/') ||
            str_contains($userAgent, 'edga/')
        ) {
            return 'Edge';
        }

        if (str_contains($userAgent, 'opr/') || str_contains($userAgent, 'opera')) {
            return 'Opera';
        }

        if (str_contains($userAgent, 'firefox/') || str_contains($userAgent, 'fxios/')) {
            return 'Firefox';
        }

        if (
            str_contains($userAgent, 'chrome/') ||
            str_contains($userAgent, 'crios/') ||
            str_contains($userAgent, 'chromium/')
        ) {
            return 'Chrome';
        }

        if (str_contains($userAgent, 'safari/')) {
            return 'Safari';
        }

        return 'Unknown';
    }
}

<?php

namespace App\Http\Controllers;

use App\Models\AccountDeleteCleanupManifest;
use App\Services\AccountDeleteCleanupCoordinator;
use App\Services\AccountDeleteCleanupManifestService;
use App\Services\AccountDeleteConfirmationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Throwable;

class AccountDeleteController extends Controller
{
    private const LOCK_SECONDS = 604800;

    public function destroy(
        Request $request,
        AccountDeleteConfirmationService $confirmationService,
        AccountDeleteCleanupManifestService $manifestService,
        AccountDeleteCleanupCoordinator $coordinator,
    ): JsonResponse {
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $validated = $request->validate([
            'email' => ['required', 'string', 'email', 'max:255'],
            'confirm_delete' => ['required', 'boolean'],
            'current_password' => ['sometimes', 'string'],
            'challenge_id' => ['sometimes', 'string'],
        ]);

        $currentAccessToken = $user->currentAccessToken();
        $accessTokenId = is_object($currentAccessToken)
            && method_exists($currentAccessToken, 'getKey')
                ? (int) $currentAccessToken->getKey()
                : null;

        if (! $confirmationService->confirm($user, $validated, $accessTokenId)) {
            throw ValidationException::withMessages([
                'confirmation' => ['The account deletion confirmation is invalid.'],
            ]);
        }

        $subjectUserId = (int) $user->getKey();

        try {
            $manifest = $manifestService->resolveOrCreateForUser($user);
        } catch (Throwable $exception) {
            Log::error('Account deletion manifest resolution failed.', [
                'user_id' => $subjectUserId,
                'exception' => $exception::class,
            ]);

            return response()->json([
                'message' => 'Account deletion could not be completed.',
            ], 500);
        }

        $lock = Cache::lock(
            'account-delete-remediation:'.hash('sha256', $manifest->operation_id),
            self::LOCK_SECONDS,
        );

        if (! $lock->get()) {
            return response()->json([
                'message' => 'Account deletion is already being processed.',
            ], 409);
        }

        try {
            $manifest = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
            if (! $manifest) {
                return response()->json([
                    'message' => 'Account deletion cannot be started right now.',
                ], 409);
            }

            if ($manifest->status === 'pending') {
                if (! $manifestService->beginAttempt($manifest)) {
                    return response()->json([
                        'message' => 'Account deletion cannot be started right now.',
                    ], 409);
                }
            } elseif ($manifest->status === 'cleanup_pending') {
                if (! $manifestService->beginRetryAttempt($manifest)) {
                    return response()->json([
                        'message' => 'Account deletion cannot be started right now.',
                    ], 409);
                }
            } elseif ($manifest->status !== 'in_progress') {
                return response()->json([
                    'message' => 'Account deletion cannot be started right now.',
                ], 409);
            }

            $manifest = $manifest->fresh();
            if (! $manifest) {
                return response()->json([
                    'message' => 'Account deletion could not be completed.',
                ], 500);
            }

            $categoryResults = $coordinator->execute($manifest);
            foreach ($categoryResults as $categoryResult) {
                if (! $categoryResult->categoryCompleted) {
                    $manifestService->markCategoryFailed($manifest, $categoryResult->category);
                    break;
                }
            }

            $finalManifest = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
            if ($finalManifest?->status === 'completed') {
                return response()->json([
                    'message' => 'Account deleted successfully.',
                ]);
            }

            if ($finalManifest?->status === 'cleanup_pending') {
                return response()->json([
                    'message' => 'Account deletion is still being processed.',
                ], 202);
            }

            return response()->json([
                'message' => 'Account deletion could not be completed.',
            ], 500);
        } catch (Throwable $exception) {
            Log::error('Account deletion cleanup failed unexpectedly.', [
                'operation_id' => $manifest->operation_id,
                'subject_user_id' => $subjectUserId,
                'exception' => $exception::class,
            ]);

            return response()->json([
                'message' => 'Account deletion could not be completed.',
            ], 500);
        } finally {
            $lock->release();
        }
    }
}

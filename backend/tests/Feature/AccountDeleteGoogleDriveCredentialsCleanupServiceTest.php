<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\AccountDeleteCleanupManifest;
use App\Models\GDriveAccount;
use App\Models\User;
use App\Services\AccountDeleteCleanupManifestService;
use App\Services\AccountDeleteGoogleDriveCredentialsCleanupResult;
use App\Services\AccountDeleteGoogleDriveCredentialsCleanupService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Tests\TestCase;

final class AccountDeleteGoogleDriveCredentialsCleanupServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_cleanup_revokes_available_tokens_and_deletes_only_subject_credentials(): void
    {
        Http::fake([
            'https://oauth2.googleapis.com/revoke' => Http::response([], 200),
        ]);

        $subject = User::factory()->create();
        $other = User::factory()->create();
        $subjectRefreshTokenAccount = $this->createAccount($subject, 'subject-refresh', 'refresh-secret', 'access-one');
        $subjectAccessTokenAccount = $this->createAccount($subject, 'subject-access', null, 'access-secret');
        $subjectRevokedAccount = $this->createAccount($subject, 'subject-revoked', null, null, now());
        $otherAccount = $this->createAccount($other, 'other', 'other-refresh', 'other-access');
        $manifest = $this->inProgressManifest($subject);

        $result = app(AccountDeleteGoogleDriveCredentialsCleanupService::class)
            ->cleanupWithResult($manifest);

        $this->assertInstanceOf(AccountDeleteGoogleDriveCredentialsCleanupResult::class, $result);
        $this->assertTrue($result->executed);
        $this->assertSame(3, $result->deletedCount);
        $this->assertNull(GDriveAccount::query()->find($subjectRefreshTokenAccount->id));
        $this->assertNull(GDriveAccount::query()->find($subjectAccessTokenAccount->id));
        $this->assertNull(GDriveAccount::query()->find($subjectRevokedAccount->id));
        $this->assertNotNull(GDriveAccount::query()->find($otherAccount->id));
        $this->assertNotNull(User::query()->find($subject->id));
        $this->assertNotNull(User::query()->find($other->id));

        Http::assertSentCount(2);
        Http::assertSent(fn (Request $request): bool => $request->url() === 'https://oauth2.googleapis.com/revoke'
            && in_array($request['token'], ['refresh-secret', 'access-secret'], true));
        $manifestAfter = AccountDeleteCleanupManifest::query()->findOrFail($manifest->getKey());
        $this->assertSame('in_progress', $manifestAfter->status);
        $this->assertSame('pending', $manifestAfter->category_states['google_drive_credentials']);
        $this->assertNull($manifestAfter->completed_at);
        $this->assertNull($manifestAfter->failure_category);
    }

    public function test_cleanup_is_local_success_when_remote_revocation_fails(): void
    {
        Http::fake([
            'https://oauth2.googleapis.com/revoke' => Http::response([], 503),
        ]);
        Log::spy();

        $subject = User::factory()->create();
        $account = $this->createAccount($subject, 'remote-failure', 'refresh-secret', 'access-secret');
        $manifest = $this->inProgressManifest($subject);

        $result = app(AccountDeleteGoogleDriveCredentialsCleanupService::class)
            ->cleanupWithResult($manifest);

        $this->assertTrue($result->executed);
        $this->assertSame(1, $result->deletedCount);
        $this->assertNull(GDriveAccount::query()->find($account->id));
        Log::shouldHaveReceived('warning')
            ->once()
            ->with('Google Drive token revocation failed during account deletion.', \Mockery::type('array'));
    }

    public function test_cleanup_rejects_ineligible_manifest_without_revoking_or_deleting_credentials(): void
    {
        Http::fake();

        $subject = User::factory()->create();
        $account = $this->createAccount($subject, 'guarded', 'refresh-secret', 'access-secret');
        $manifest = app(AccountDeleteCleanupManifestService::class)->createForUser($subject);

        $result = app(AccountDeleteGoogleDriveCredentialsCleanupService::class)
            ->cleanupWithResult($manifest);

        $this->assertFalse($result->executed);
        $this->assertSame(0, $result->deletedCount);
        $this->assertNotNull(GDriveAccount::query()->find($account->id));
        Http::assertNothingSent();
    }

    private function inProgressManifest(User $user): AccountDeleteCleanupManifest
    {
        $manifestService = app(AccountDeleteCleanupManifestService::class);
        $manifest = $manifestService->createForUser($user);
        $this->assertTrue($manifestService->beginAttempt($manifest));

        return AccountDeleteCleanupManifest::query()->findOrFail($manifest->getKey());
    }

    private function createAccount(
        User $user,
        string $suffix,
        ?string $refreshToken,
        ?string $accessToken,
        ?Carbon $revokedAt = null,
    ): GDriveAccount {
        return GDriveAccount::query()->create([
            'user_id' => $user->id,
            'label' => $suffix,
            'email' => "{$suffix}@example.com",
            'access_token' => $accessToken,
            'refresh_token' => $refreshToken,
            'revoked_at' => $revokedAt,
        ]);
    }
}

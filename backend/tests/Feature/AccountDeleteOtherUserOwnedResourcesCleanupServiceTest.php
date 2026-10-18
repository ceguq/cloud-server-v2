<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\AccountDeleteCleanupManifest;
use App\Models\Device;
use App\Models\User;
use App\Services\AccountDeleteCleanupManifestService;
use App\Services\AccountDeleteOtherUserOwnedResourcesCleanupResult;
use App\Services\AccountDeleteOtherUserOwnedResourcesCleanupService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\PersonalAccessToken;
use Tests\TestCase;

final class AccountDeleteOtherUserOwnedResourcesCleanupServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_cleanup_deletes_only_subject_sessions_and_password_reset_token_idempotently(): void
    {
        $subject = User::factory()->create();
        $other = User::factory()->create();
        $subjectToken = $subject->createToken('subject');
        $otherToken = $other->createToken('other');
        $subjectDevice = $this->createDevice($subject, 'subject-device');
        $otherDevice = $this->createDevice($other, 'other-device');
        $this->createSession('subject-one', $subject->id);
        $this->createSession('subject-two', $subject->id);
        $this->createSession('other', $other->id);
        $this->createSession('unowned', null);
        $this->createPasswordResetToken((string) $subject->email);
        $this->createPasswordResetToken((string) $other->email);
        $manifest = $this->eligibleManifest($subject);

        $service = app(AccountDeleteOtherUserOwnedResourcesCleanupService::class);
        $firstResult = $service->cleanupWithResult($manifest);
        $secondResult = $service->cleanupWithResult($manifest);

        $this->assertInstanceOf(AccountDeleteOtherUserOwnedResourcesCleanupResult::class, $firstResult);
        $this->assertTrue($firstResult->executed);
        $this->assertSame(3, $firstResult->deletedCount);
        $this->assertInstanceOf(AccountDeleteOtherUserOwnedResourcesCleanupResult::class, $secondResult);
        $this->assertTrue($secondResult->executed);
        $this->assertSame(0, $secondResult->deletedCount);
        $this->assertDatabaseMissing('sessions', ['id' => 'subject-one']);
        $this->assertDatabaseMissing('sessions', ['id' => 'subject-two']);
        $this->assertDatabaseHas('sessions', ['id' => 'other', 'user_id' => $other->id]);
        $this->assertDatabaseHas('sessions', ['id' => 'unowned', 'user_id' => null]);
        $this->assertDatabaseMissing('password_reset_tokens', ['email' => $subject->email]);
        $this->assertDatabaseHas('password_reset_tokens', ['email' => $other->email]);
        $this->assertNotNull(PersonalAccessToken::query()->find($subjectToken->accessToken->getKey()));
        $this->assertNotNull(PersonalAccessToken::query()->find($otherToken->accessToken->getKey()));
        $this->assertNotNull(Device::query()->find($subjectDevice->getKey()));
        $this->assertNotNull(Device::query()->find($otherDevice->getKey()));
        $this->assertNotNull(User::query()->find($subject->getKey()));
        $this->assertNotNull(User::query()->find($other->getKey()));

        $manifestAfter = AccountDeleteCleanupManifest::query()->findOrFail($manifest->getKey());
        $this->assertSame('in_progress', $manifestAfter->status);
        $this->assertSame('pending', $manifestAfter->category_states['other_user_owned_resources']);
        $this->assertNull($manifestAfter->completed_at);
        $this->assertNull($manifestAfter->failure_category);
    }

    public function test_cleanup_succeeds_when_no_residual_resources_exist(): void
    {
        $subject = User::factory()->create();
        $manifest = $this->eligibleManifest($subject);

        $result = app(AccountDeleteOtherUserOwnedResourcesCleanupService::class)
            ->cleanupWithResult($manifest);

        $this->assertTrue($result->executed);
        $this->assertSame(0, $result->deletedCount);
        $this->assertNotNull(User::query()->find($subject->getKey()));
        $this->assertNotNull(AccountDeleteCleanupManifest::query()->find($manifest->getKey()));
    }

    public function test_cleanup_rejects_non_in_progress_completed_and_failed_manifests(): void
    {
        $subject = User::factory()->create();
        $this->createSession('guarded', $subject->id);
        $manifestService = app(AccountDeleteCleanupManifestService::class);
        $pendingManifest = $manifestService->createForUser($subject);
        $completedCategoryManifest = $this->eligibleManifest($subject);
        $this->assertTrue($manifestService->markCategoryCompleted($completedCategoryManifest, 'other_user_owned_resources'));
        $failedManifest = $this->eligibleManifest($subject);
        $failedManifest->failure_category = 'activity_logs';
        $failedManifest->save();

        foreach ([$pendingManifest, $completedCategoryManifest, $failedManifest] as $manifest) {
            $result = app(AccountDeleteOtherUserOwnedResourcesCleanupService::class)
                ->cleanupWithResult($manifest);
            $this->assertFalse($result->executed);
            $this->assertSame(0, $result->deletedCount);
        }

        $this->assertDatabaseHas('sessions', ['id' => 'guarded', 'user_id' => $subject->id]);
    }

    private function eligibleManifest(User $user): AccountDeleteCleanupManifest
    {
        $manifestService = app(AccountDeleteCleanupManifestService::class);
        $manifest = $manifestService->createForUser($user);
        $this->assertTrue($manifestService->beginAttempt($manifest));

        foreach ([
            'share_links',
            'oauth_identities',
            'physical_local_files',
            'database_records',
            'devices',
            'sanctum_tokens',
            'google_drive_credentials',
            'activity_logs',
        ] as $category) {
            $this->assertTrue($manifestService->markCategoryCompleted($manifest, $category));
        }

        return AccountDeleteCleanupManifest::query()->findOrFail($manifest->getKey());
    }

    private function createDevice(User $user, string $hash): Device
    {
        return Device::query()->create([
            'user_id' => $user->getKey(),
            'device_hash' => hash('sha256', $hash),
        ]);
    }

    private function createSession(string $id, ?int $userId): void
    {
        DB::table('sessions')->insert([
            'id' => $id,
            'user_id' => $userId,
            'payload' => 'session-payload',
            'last_activity' => now()->timestamp,
        ]);
    }

    private function createPasswordResetToken(string $email): void
    {
        DB::table('password_reset_tokens')->insert([
            'email' => $email,
            'token' => hash('sha256', $email),
            'created_at' => now(),
        ]);
    }
}

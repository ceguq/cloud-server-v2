<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\AccountDeleteCleanupManifest;
use App\Models\User;
use App\Services\AccountDeleteCleanupManifestService;
use App\Services\AccountDeleteUserRecordCleanupService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class AccountDeleteUserRecordCleanupServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_service_rejects_until_every_other_category_is_completed(): void
    {
        $subject = User::factory()->create();
        $manifest = $this->inProgressManifest($subject);

        $result = app(AccountDeleteUserRecordCleanupService::class)->cleanupWithResult($manifest);

        $this->assertFalse($result->executed);
        $this->assertSame(0, $result->deletedCount);
        $this->assertNotNull(User::query()->find($subject->getKey()));
    }

    public function test_service_deletes_only_the_manifest_subject_and_accepts_an_already_missing_user(): void
    {
        $subject = User::factory()->create();
        $other = User::factory()->create();
        $manifest = $this->eligibleManifest($subject);
        $service = app(AccountDeleteUserRecordCleanupService::class);

        $firstResult = $service->cleanupWithResult($manifest);
        $secondResult = $service->cleanupWithResult($manifest);

        $this->assertTrue($firstResult->executed);
        $this->assertSame(1, $firstResult->deletedCount);
        $this->assertTrue($secondResult->executed);
        $this->assertSame(0, $secondResult->deletedCount);
        $this->assertNull(User::query()->find($subject->getKey()));
        $this->assertNotNull(User::query()->find($other->getKey()));
        $this->assertSame('pending', $manifest->fresh()->category_states['user_record']);
    }

    private function inProgressManifest(User $user): AccountDeleteCleanupManifest
    {
        $manifestService = app(AccountDeleteCleanupManifestService::class);
        $manifest = $manifestService->createForUser($user);
        $this->assertTrue($manifestService->beginAttempt($manifest));

        return AccountDeleteCleanupManifest::query()->findOrFail($manifest->getKey());
    }

    private function eligibleManifest(User $user): AccountDeleteCleanupManifest
    {
        $manifestService = app(AccountDeleteCleanupManifestService::class);
        $manifest = $manifestService->createForUser($user);
        $this->assertTrue($manifestService->beginAttempt($manifest));

        foreach (AccountDeleteCleanupManifestService::CLEANUP_CATEGORIES as $category) {
            if ($category !== 'user_record') {
                $this->assertTrue($manifestService->markCategoryCompleted($manifest, $category));
            }
        }

        return AccountDeleteCleanupManifest::query()->findOrFail($manifest->getKey());
    }
}

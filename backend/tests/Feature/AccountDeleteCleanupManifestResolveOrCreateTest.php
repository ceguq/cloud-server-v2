<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\AccountDeleteCleanupManifest;
use App\Models\User;
use App\Services\AccountDeleteCleanupManifestService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class AccountDeleteCleanupManifestResolveOrCreateTest extends TestCase
{
    use RefreshDatabase;

    public function test_resolve_or_create_reuses_an_incomplete_manifest_for_the_same_user(): void
    {
        $user = User::factory()->create();
        $service = app(AccountDeleteCleanupManifestService::class);
        $firstManifest = $service->resolveOrCreateForUser($user);

        $this->assertTrue($service->beginAttempt($firstManifest));
        $inProgressManifest = $firstManifest->fresh();
        $this->assertNotNull($inProgressManifest);

        $resolvedManifest = $service->resolveOrCreateForUser($user);

        $this->assertSame($firstManifest->getKey(), $resolvedManifest->getKey());
        $this->assertSame(
            'in_progress',
            AccountDeleteCleanupManifest::query()->findOrFail($resolvedManifest->getKey())->status,
        );
        $this->assertSame(
            1,
            AccountDeleteCleanupManifest::query()
                ->where('subject_user_id', $user->getKey())
                ->whereIn('status', ['pending', 'in_progress', 'cleanup_pending'])
                ->count(),
        );
    }

    public function test_resolve_or_create_starts_a_new_manifest_after_the_previous_one_completed(): void
    {
        $user = User::factory()->create();
        $service = app(AccountDeleteCleanupManifestService::class);
        $completedManifest = $service->createForUser($user);
        $completedManifest->status = 'completed';
        $completedManifest->save();

        $newManifest = $service->resolveOrCreateForUser($user);

        $this->assertNotSame($completedManifest->getKey(), $newManifest->getKey());
        $this->assertSame('pending', $newManifest->status);
        $this->assertSame(
            1,
            AccountDeleteCleanupManifest::query()
                ->where('subject_user_id', $user->getKey())
                ->whereIn('status', ['pending', 'in_progress', 'cleanup_pending'])
                ->count(),
        );
    }
}

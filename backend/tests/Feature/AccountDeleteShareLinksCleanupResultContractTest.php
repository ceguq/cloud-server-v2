<?php

namespace Tests\Feature;

use App\Models\AccountDeleteCleanupManifest;
use App\Models\File;
use App\Models\ShareLink;
use App\Models\User;
use App\Services\AccountDeleteCleanupManifestService;
use App\Services\AccountDeleteShareLinksCleanupResult;
use App\Services\AccountDeleteShareLinksCleanupService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AccountDeleteShareLinksCleanupResultContractTest extends TestCase
{
    use RefreshDatabase;

    public function test_cleanup_result_distinguishes_rejected_zero_from_eligible_zero(): void
    {
        $manifestService = app(AccountDeleteCleanupManifestService::class);
        $cleanupService = app(AccountDeleteShareLinksCleanupService::class);

        // Scenario A — Rejected zero
        $rejectedSubject = User::factory()->create();

        $rejectedFile = File::create([
            'user_id' => $rejectedSubject->id,
            'folder_id' => null,
            'original_name' => 'share-result-rejected-zero.bin',
            'stored_name' => 'share-result-rejected-zero.bin',
            'path' => 'nimbusdrive/share-result-rejected-zero.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 1,
        ]);

        $this->assertNotNull(File::query()->find($rejectedFile->id));

        $rejectedShareLink = ShareLink::create([
            'file_id' => $rejectedFile->id,
            'token' => 'share-result-rejected-zero-token',
            'expires_at' => null,
            'password' => null,
            'download_count' => 0,
        ]);

        $this->assertNotNull(ShareLink::query()->where('token', 'share-result-rejected-zero-token')->first());
        $this->assertSame($rejectedFile->id, $rejectedShareLink->file_id);

        $rejectedManifest = $manifestService->createForUser($rejectedSubject);

        $rejectedManifestReloaded = AccountDeleteCleanupManifest::query()->find($rejectedManifest->getKey());
        $this->assertNotNull($rejectedManifestReloaded);
        $this->assertSame('pending', $rejectedManifestReloaded->status);
        $this->assertSame(0, (int) $rejectedManifestReloaded->attempt_count);
        $this->assertSame('pending', $rejectedManifestReloaded->category_states['share_links']);
        $this->assertNull($rejectedManifestReloaded->completed_at);
        $this->assertNull($rejectedManifestReloaded->failure_category);

        $rejectedResult = $cleanupService->cleanupWithResult($rejectedManifest);

        $this->assertInstanceOf(
            AccountDeleteShareLinksCleanupResult::class,
            $rejectedResult,
        );

        $this->assertFalse($rejectedResult->executed);
        $this->assertSame(0, $rejectedResult->deletedCount);

        $this->assertNotNull(
            ShareLink::query()->where('token', 'share-result-rejected-zero-token')->first(),
        );

        $this->assertNotNull(User::query()->find($rejectedSubject->id));

        $rejectedFileAfter = File::query()->find($rejectedFile->id);
        $this->assertNotNull($rejectedFileAfter);
        $this->assertSame($rejectedSubject->id, $rejectedFileAfter->user_id);
        $this->assertSame('nimbusdrive/share-result-rejected-zero.bin', $rejectedFileAfter->path);

        $afterRejectedManifest = AccountDeleteCleanupManifest::query()->find($rejectedManifest->getKey());
        $this->assertNotNull($afterRejectedManifest);
        $this->assertSame('pending', $afterRejectedManifest->status);
        $this->assertSame(0, (int) $afterRejectedManifest->attempt_count);
        $this->assertSame('pending', $afterRejectedManifest->category_states['share_links']);
        $this->assertNull($afterRejectedManifest->completed_at);
        $this->assertNull($afterRejectedManifest->failure_category);

        $beforeOperationIdRejected = $rejectedManifestReloaded->operation_id;
        $beforeOwnershipSnapshotRejected = $rejectedManifestReloaded->ownership_snapshot;
        $beforeCategoryStatesRejected = $rejectedManifestReloaded->category_states;
        $beforeStatusRejected = $rejectedManifestReloaded->status;
        $beforeAttemptCountRejected = $rejectedManifestReloaded->attempt_count;
        $beforeLastAttemptAtRejected = $rejectedManifestReloaded->last_attempt_at;
        $beforeCompletedAtRejected = $rejectedManifestReloaded->completed_at;
        $beforeFailureCategoryRejected = $rejectedManifestReloaded->failure_category;
        $beforeCreatedAtRejected = $rejectedManifestReloaded->created_at;
        $beforeUpdatedAtRejected = $rejectedManifestReloaded->updated_at;

        $this->assertSame($beforeOperationIdRejected, $afterRejectedManifest->operation_id);
        $this->assertSame($rejectedSubject->id, $afterRejectedManifest->subject_user_id);
        $this->assertSame($beforeOwnershipSnapshotRejected, $afterRejectedManifest->ownership_snapshot);
        $this->assertSame($beforeCategoryStatesRejected, $afterRejectedManifest->category_states);
        $this->assertSame($beforeStatusRejected, $afterRejectedManifest->status);
        $this->assertSame($beforeAttemptCountRejected, (int) $afterRejectedManifest->attempt_count);
        $this->assertTrue($beforeLastAttemptAtRejected === $afterRejectedManifest->last_attempt_at);
        $this->assertTrue($beforeCompletedAtRejected === $afterRejectedManifest->completed_at);
        $this->assertTrue($beforeFailureCategoryRejected === $afterRejectedManifest->failure_category);
        $this->assertTrue($beforeCreatedAtRejected->equalTo($afterRejectedManifest->created_at));
        $this->assertTrue($beforeUpdatedAtRejected->equalTo($afterRejectedManifest->updated_at));

        // Scenario B — Eligible zero
        $eligibleSubject = User::factory()->create();

        $eligibleFile = File::create([
            'user_id' => $eligibleSubject->id,
            'folder_id' => null,
            'original_name' => 'share-result-eligible-zero.bin',
            'stored_name' => 'share-result-eligible-zero.bin',
            'path' => 'nimbusdrive/share-result-eligible-zero.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 1,
        ]);

        $this->assertNotNull(File::query()->find($eligibleFile->id));
        $this->assertSame(0, ShareLink::query()->whereIn('file_id', [$eligibleFile->id])->count());

        $eligibleManifest = $manifestService->createForUser($eligibleSubject);

        $started = $manifestService->beginAttempt($eligibleManifest);
        $this->assertTrue($started);

        $eligibleInProgress = AccountDeleteCleanupManifest::query()->find($eligibleManifest->getKey());
        $this->assertNotNull($eligibleInProgress);

        $this->assertSame('in_progress', $eligibleInProgress->status);
        $this->assertSame(1, (int) $eligibleInProgress->attempt_count);
        $this->assertSame('pending', $eligibleInProgress->category_states['share_links']);
        $this->assertNull($eligibleInProgress->completed_at);
        $this->assertNull($eligibleInProgress->failure_category);

        $eligibleResult = $cleanupService->cleanupWithResult($eligibleInProgress);

        $this->assertInstanceOf(
            AccountDeleteShareLinksCleanupResult::class,
            $eligibleResult,
        );

        $this->assertTrue($eligibleResult->executed);
        $this->assertSame(0, $eligibleResult->deletedCount);

        $this->assertNotNull(User::query()->find($eligibleSubject->id));

        $eligibleFileAfter = File::query()->find($eligibleFile->id);
        $this->assertNotNull($eligibleFileAfter);
        $this->assertSame($eligibleSubject->id, $eligibleFileAfter->user_id);
        $this->assertSame('nimbusdrive/share-result-eligible-zero.bin', $eligibleFileAfter->path);

        $this->assertSame(
            0,
            ShareLink::query()->whereIn('file_id', [$eligibleFile->id])->count(),
        );

        $afterEligibleManifest = AccountDeleteCleanupManifest::query()->find($eligibleInProgress->getKey());
        $this->assertNotNull($afterEligibleManifest);

        $this->assertSame('in_progress', $afterEligibleManifest->status);
        $this->assertSame('pending', $afterEligibleManifest->category_states['share_links']);
        $this->assertSame(1, (int) $afterEligibleManifest->attempt_count);
        $this->assertNull($afterEligibleManifest->completed_at);
        $this->assertNull($afterEligibleManifest->failure_category);

        $this->assertSame(
            $rejectedResult->deletedCount,
            $eligibleResult->deletedCount,
        );

        $this->assertNotSame(
            $rejectedResult->executed,
            $eligibleResult->executed,
        );
    }
}

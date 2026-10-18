<?php

namespace Tests\Feature;

use App\Models\AccountDeleteCleanupManifest;
use App\Models\User;
use App\Services\AccountDeleteCleanupManifestService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AccountDeleteCleanupManifestRetryAttemptTest extends TestCase
{
    use RefreshDatabase;

    public function test_account_delete_cleanup_manifest_begins_second_attempt_from_cleanup_pending(): void
    {
        $subjectUser = User::factory()->create();

        /** @var AccountDeleteCleanupManifestService $manifestService */
        $manifestService = app(AccountDeleteCleanupManifestService::class);

        $manifest = $manifestService->createForUser($subjectUser);
        $this->assertSame('pending', $manifest->status);

        $firstAttemptStarted = $manifestService->beginAttempt($manifest);
        $this->assertTrue($firstAttemptStarted);

        $firstAttemptManifest = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($firstAttemptManifest);

        $this->assertSame('in_progress', $firstAttemptManifest->status);
        $this->assertSame(1, $firstAttemptManifest->attempt_count);
        $this->assertNotNull($firstAttemptManifest->last_attempt_at);
        $this->assertNull($firstAttemptManifest->completed_at);
        $this->assertNull($firstAttemptManifest->failure_category);

        $categoryStates = $firstAttemptManifest->category_states;
        $this->assertIsArray($categoryStates);
        $this->assertCount(10, $categoryStates);
        foreach ($categoryStates as $state) {
            $this->assertSame('pending', $state);
        }

        $completed = $manifestService->markCategoryCompleted(
            $firstAttemptManifest,
            'share_links',
        );
        $this->assertTrue($completed);

        $afterCompletion = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($afterCompletion);

        $this->assertSame('in_progress', $afterCompletion->status);
        $this->assertSame(1, $afterCompletion->attempt_count);
        $this->assertNull($afterCompletion->failure_category);
        $this->assertSame('completed', $afterCompletion->category_states['share_links']);
        $this->assertSame('pending', $afterCompletion->category_states['oauth_identities']);
        $this->assertNull($afterCompletion->completed_at);

        $failureRecorded = $manifestService->markCategoryFailed(
            $afterCompletion,
            'oauth_identities',
        );
        $this->assertTrue($failureRecorded);

        $cleanupPendingManifest = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($cleanupPendingManifest);

        $this->assertSame('cleanup_pending', $cleanupPendingManifest->status);
        $this->assertSame('oauth_identities', $cleanupPendingManifest->failure_category);
        $this->assertNull($cleanupPendingManifest->completed_at);
        $this->assertSame('completed', $cleanupPendingManifest->category_states['share_links']);
        $this->assertSame('failed', $cleanupPendingManifest->category_states['oauth_identities']);
        $this->assertSame(1, $cleanupPendingManifest->attempt_count);
        $this->assertNotNull($cleanupPendingManifest->last_attempt_at);

        $expectedPendingCategories = [
            'database_records',
            'physical_local_files',
            'devices',
            'sanctum_tokens',
            'google_drive_credentials',
            'activity_logs',
            'user_record',
            'other_user_owned_resources',
        ];

        foreach ($expectedPendingCategories as $category) {
            $this->assertSame('pending', $cleanupPendingManifest->category_states[$category]);
        }

        $firstLastAttemptAt = $cleanupPendingManifest->last_attempt_at;
        $this->assertNotNull($firstLastAttemptAt);

        $operationId = $cleanupPendingManifest->operation_id;
        $subjectUserId = $cleanupPendingManifest->subject_user_id;
        $ownershipSnapshot = $cleanupPendingManifest->ownership_snapshot;
        $completedAt = $cleanupPendingManifest->completed_at;
        $createdAt = $cleanupPendingManifest->created_at;

        $preRetryCategoryStates = $cleanupPendingManifest->category_states;
        $preRetryAttemptCount = $cleanupPendingManifest->attempt_count;
        $preRetryLastAttemptAt = $cleanupPendingManifest->last_attempt_at;
        $preRetryStatus = $cleanupPendingManifest->status;
        $preRetryFailureCategory = $cleanupPendingManifest->failure_category;

        $this->assertNotNull(User::query()->find($subjectUser->id));

        $resumed = $manifestService->beginRetryAttempt(
            $cleanupPendingManifest,
        );
        $this->assertTrue($resumed);

        $afterRetry = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($afterRetry);

        $this->assertSame('in_progress', $afterRetry->status);
        $this->assertNull($afterRetry->failure_category);
        $this->assertNull($afterRetry->completed_at);
        $this->assertSame(2, $afterRetry->attempt_count);
        $this->assertSame('completed', $afterRetry->category_states['share_links']);
        $this->assertSame('pending', $afterRetry->category_states['oauth_identities']);
        $this->assertNotNull($afterRetry->last_attempt_at);

        foreach ($expectedPendingCategories as $category) {
            $this->assertSame('pending', $afterRetry->category_states[$category]);
        }

        $this->assertTrue(
            $afterRetry->last_attempt_at->greaterThanOrEqualTo(
                $firstLastAttemptAt,
            ),
        );

        $this->assertSame($operationId, $afterRetry->operation_id);
        $this->assertSame($subjectUserId, $afterRetry->subject_user_id);
        $this->assertSame($ownershipSnapshot, $afterRetry->ownership_snapshot);
        $this->assertEquals($completedAt, $afterRetry->completed_at);
        $this->assertEquals($createdAt, $afterRetry->created_at);
        $this->assertNotNull(User::query()->find($subjectUser->id));

        $updatedAtAfterRetry = $afterRetry->updated_at;
        $baselineAfterRetry = [
            'operation_id' => $afterRetry->operation_id,
            'subject_user_id' => $afterRetry->subject_user_id,
            'ownership_snapshot' => $afterRetry->ownership_snapshot,
            'category_states' => $afterRetry->category_states,
            'status' => $afterRetry->status,
            'attempt_count' => $afterRetry->attempt_count,
            'last_attempt_at' => $afterRetry->last_attempt_at,
            'completed_at' => $afterRetry->completed_at,
            'failure_category' => $afterRetry->failure_category,
            'created_at' => $afterRetry->created_at,
            'updated_at' => $updatedAtAfterRetry,
        ];

        $repeated = $manifestService->beginRetryAttempt(
            $afterRetry,
        );
        $this->assertFalse($repeated);

        $afterRepeat = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($afterRepeat);

        $this->assertSame($baselineAfterRetry['operation_id'], $afterRepeat->operation_id);
        $this->assertSame($baselineAfterRetry['subject_user_id'], $afterRepeat->subject_user_id);
        $this->assertSame($baselineAfterRetry['ownership_snapshot'], $afterRepeat->ownership_snapshot);
        $this->assertSame($baselineAfterRetry['status'], $afterRepeat->status);
        $this->assertSame($baselineAfterRetry['attempt_count'], $afterRepeat->attempt_count);
        $this->assertNull($afterRepeat->completed_at);
        $this->assertNull($afterRepeat->failure_category);
        $this->assertSame('completed', $afterRepeat->category_states['share_links']);
        $this->assertSame('pending', $afterRepeat->category_states['oauth_identities']);

        foreach ($expectedPendingCategories as $category) {
            $this->assertSame('pending', $afterRepeat->category_states[$category]);
        }

        $this->assertTrue(
            $baselineAfterRetry['last_attempt_at']->equalTo($afterRepeat->last_attempt_at),
        );
        $this->assertTrue(
            $baselineAfterRetry['updated_at']->equalTo($afterRepeat->updated_at),
        );
        $this->assertTrue(
            $baselineAfterRetry['created_at']->equalTo($afterRepeat->created_at),
        );

        $this->assertSame($baselineAfterRetry['category_states'], $afterRepeat->category_states);
        $this->assertSame($baselineAfterRetry['completed_at'], $afterRepeat->completed_at);
        $this->assertSame($baselineAfterRetry['failure_category'], $afterRepeat->failure_category);
        $this->assertSame($baselineAfterRetry['attempt_count'], $afterRepeat->attempt_count);
        $this->assertTrue(
            $baselineAfterRetry['last_attempt_at']->equalTo($afterRepeat->last_attempt_at),
        );

        // Pre-retry immutable baseline sanity (guards against accidental direct mutation).
        $this->assertSame($operationId, $baselineAfterRetry['operation_id']);
        $this->assertSame($subjectUserId, $baselineAfterRetry['subject_user_id']);
        $this->assertSame($ownershipSnapshot, $baselineAfterRetry['ownership_snapshot']);
        $this->assertTrue(
            $preRetryLastAttemptAt->equalTo($preRetryLastAttemptAt),
        );
    }
}

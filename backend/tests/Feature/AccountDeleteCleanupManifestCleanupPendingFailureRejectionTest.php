<?php

namespace Tests\Feature;

use App\Models\AccountDeleteCleanupManifest;
use App\Models\User;
use App\Services\AccountDeleteCleanupManifestService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AccountDeleteCleanupManifestCleanupPendingFailureRejectionTest extends TestCase
{
    use RefreshDatabase;

    public function test_account_delete_cleanup_manifest_rejects_second_failure_category_while_cleanup_pending(): void
    {
        $subjectUser = User::factory()->create();

        /** @var AccountDeleteCleanupManifestService $manifestService */
        $manifestService = app(AccountDeleteCleanupManifestService::class);

        $manifest = $manifestService->createForUser($subjectUser);

        $started = $manifestService->beginAttempt($manifest);
        $this->assertTrue($started);

        $inProgressManifest = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($inProgressManifest);

        $this->assertSame('in_progress', $inProgressManifest->status);
        $this->assertSame(1, $inProgressManifest->attempt_count);
        $this->assertNull($inProgressManifest->completed_at);
        $this->assertNull($inProgressManifest->failure_category);

        $categoryStates = $inProgressManifest->category_states;
        $this->assertIsArray($categoryStates);
        $this->assertCount(10, $categoryStates);

        foreach ($categoryStates as $value) {
            $this->assertSame('pending', $value);
        }

        $completed = $manifestService->markCategoryCompleted(
            $inProgressManifest,
            'share_links',
        );
        $this->assertTrue($completed);

        $manifestAfterCompletion = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($manifestAfterCompletion);
        $this->assertSame('in_progress', $manifestAfterCompletion->status);
        $this->assertSame('completed', $manifestAfterCompletion->category_states['share_links']);
        $this->assertSame('pending', $manifestAfterCompletion->category_states['oauth_identities']);
        $this->assertSame('pending', $manifestAfterCompletion->category_states['devices']);
        $this->assertNull($manifestAfterCompletion->failure_category);
        $this->assertNull($manifestAfterCompletion->completed_at);

        $firstFailure = $manifestService->markCategoryFailed(
            $manifestAfterCompletion,
            'oauth_identities',
        );
        $this->assertTrue($firstFailure);

        $cleanupPendingManifest = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($cleanupPendingManifest);

        $this->assertSame('cleanup_pending', $cleanupPendingManifest->status);
        $this->assertSame('oauth_identities', $cleanupPendingManifest->failure_category);
        $this->assertSame('completed', $cleanupPendingManifest->category_states['share_links']);
        $this->assertSame('failed', $cleanupPendingManifest->category_states['oauth_identities']);
        $this->assertSame('pending', $cleanupPendingManifest->category_states['devices']);
        $this->assertNull($cleanupPendingManifest->completed_at);
        $this->assertSame(1, $cleanupPendingManifest->attempt_count);

        $this->assertNotNull(User::query()->find($subjectUser->id));

        // Capture baseline right before rejected second failure.
        $baseline = [
            'operation_id' => $cleanupPendingManifest->operation_id,
            'subject_user_id' => $cleanupPendingManifest->subject_user_id,
            'ownership_snapshot' => $cleanupPendingManifest->ownership_snapshot,
            'category_states' => $cleanupPendingManifest->category_states,
            'status' => $cleanupPendingManifest->status,
            'attempt_count' => $cleanupPendingManifest->attempt_count,
            'last_attempt_at' => $cleanupPendingManifest->last_attempt_at,
            'completed_at' => $cleanupPendingManifest->completed_at,
            'failure_category' => $cleanupPendingManifest->failure_category,
            'created_at' => $cleanupPendingManifest->created_at,
            'updated_at' => $cleanupPendingManifest->updated_at,
        ];

        $secondFailure = $manifestService->markCategoryFailed(
            $cleanupPendingManifest,
            'devices',
        );

        $this->assertFalse($secondFailure);

        $manifestAfterRejectedFailure = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($manifestAfterRejectedFailure);

        $this->assertSame('cleanup_pending', $manifestAfterRejectedFailure->status);
        $this->assertSame('oauth_identities', $manifestAfterRejectedFailure->failure_category);
        $this->assertSame('failed', $manifestAfterRejectedFailure->category_states['oauth_identities']);
        $this->assertSame('pending', $manifestAfterRejectedFailure->category_states['devices']);
        $this->assertSame('completed', $manifestAfterRejectedFailure->category_states['share_links']);
        $this->assertNull($manifestAfterRejectedFailure->completed_at);
        $this->assertSame(1, $manifestAfterRejectedFailure->attempt_count);

        $this->assertSame($baseline['category_states'], $manifestAfterRejectedFailure->category_states);

        $this->assertSame($baseline['operation_id'], $manifestAfterRejectedFailure->operation_id);
        $this->assertSame($baseline['subject_user_id'], $manifestAfterRejectedFailure->subject_user_id);
        $this->assertSame($baseline['ownership_snapshot'], $manifestAfterRejectedFailure->ownership_snapshot);
        $this->assertSame($baseline['status'], $manifestAfterRejectedFailure->status);
        $this->assertSame($baseline['attempt_count'], $manifestAfterRejectedFailure->attempt_count);
        $this->assertEquals($baseline['last_attempt_at'], $manifestAfterRejectedFailure->last_attempt_at);
        $this->assertEquals($baseline['completed_at'], $manifestAfterRejectedFailure->completed_at);
        $this->assertSame($baseline['failure_category'], $manifestAfterRejectedFailure->failure_category);
        $this->assertEquals($baseline['created_at'], $manifestAfterRejectedFailure->created_at);
        $this->assertEquals($baseline['updated_at'], $manifestAfterRejectedFailure->updated_at);

        $this->assertNotNull(User::query()->find($subjectUser->id));
    }
}

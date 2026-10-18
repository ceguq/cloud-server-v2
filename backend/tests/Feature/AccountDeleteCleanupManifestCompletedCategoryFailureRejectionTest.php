<?php

namespace Tests\Feature;

use App\Models\AccountDeleteCleanupManifest;
use App\Models\User;
use App\Services\AccountDeleteCleanupManifestService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AccountDeleteCleanupManifestCompletedCategoryFailureRejectionTest extends TestCase
{
    use RefreshDatabase;

    public function test_account_delete_cleanup_manifest_rejects_failing_completed_category_without_entering_cleanup_pending(): void
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

        $afterCompletion = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($afterCompletion);

        $this->assertSame('in_progress', $afterCompletion->status);
        $this->assertSame('completed', $afterCompletion->category_states['share_links']);
        $this->assertNull($afterCompletion->failure_category);
        $this->assertNull($afterCompletion->completed_at);

        foreach ($afterCompletion->category_states as $category => $state) {
            if ($category === 'share_links') {
                continue;
            }
            $this->assertSame('pending', $state);
        }

        $manifestBeforeRejectedFailure = $afterCompletion;

        $baseline = [
            'operation_id' => $manifestBeforeRejectedFailure->operation_id,
            'subject_user_id' => $manifestBeforeRejectedFailure->subject_user_id,
            'ownership_snapshot' => $manifestBeforeRejectedFailure->ownership_snapshot,
            'category_states' => $manifestBeforeRejectedFailure->category_states,
            'status' => $manifestBeforeRejectedFailure->status,
            'attempt_count' => $manifestBeforeRejectedFailure->attempt_count,
            'last_attempt_at' => $manifestBeforeRejectedFailure->last_attempt_at,
            'completed_at' => $manifestBeforeRejectedFailure->completed_at,
            'failure_category' => $manifestBeforeRejectedFailure->failure_category,
            'created_at' => $manifestBeforeRejectedFailure->created_at,
            'updated_at' => $manifestBeforeRejectedFailure->updated_at,
        ];

        $this->assertNotNull(User::query()->find($subjectUser->id));

        $failed = $manifestService->markCategoryFailed(
            $manifestBeforeRejectedFailure,
            'share_links',
        );

        $this->assertFalse($failed);

        $manifestAfterRejectedFailure = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($manifestAfterRejectedFailure);

        $this->assertSame('in_progress', $manifestAfterRejectedFailure->status);
        $this->assertNull($manifestAfterRejectedFailure->failure_category);
        $this->assertNull($manifestAfterRejectedFailure->completed_at);
        $this->assertSame('completed', $manifestAfterRejectedFailure->category_states['share_links']);

        foreach ($manifestAfterRejectedFailure->category_states as $category => $state) {
            if ($category === 'share_links') {
                $this->assertSame('completed', $state);

                continue;
            }
            $this->assertSame('pending', $state);
        }

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

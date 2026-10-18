<?php

namespace Tests\Feature;

use App\Models\AccountDeleteCleanupManifest;
use App\Models\User;
use App\Services\AccountDeleteCleanupManifestService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AccountDeleteCleanupManifestCategoryFailureTest extends TestCase
{
    use RefreshDatabase;

    public function test_account_delete_cleanup_manifest_atomically_marks_pending_category_failed_and_enters_cleanup_pending(): void
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
        $this->assertNull($manifestAfterCompletion->failure_category);
        $this->assertNull($manifestAfterCompletion->completed_at);

        $baseline = [
            'operation_id' => $manifestAfterCompletion->operation_id,
            'subject_user_id' => $manifestAfterCompletion->subject_user_id,
            'ownership_snapshot' => $manifestAfterCompletion->ownership_snapshot,
            'attempt_count' => $manifestAfterCompletion->attempt_count,
            'last_attempt_at' => $manifestAfterCompletion->last_attempt_at,
            'completed_at' => $manifestAfterCompletion->completed_at,
            // created_at is expected to exist in the fixture row.
            'created_at' => $manifestAfterCompletion->created_at,
        ];

        $manifestBeforeFailure = $manifestAfterCompletion;

        // Category failure transition (missing production API -> expected RED).
        $failed = $manifestService->markCategoryFailed(
            $manifestBeforeFailure,
            'oauth_identities',
        );

        $this->assertTrue($failed);

        $manifestAfterFailure = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($manifestAfterFailure);

        // Expected atomic state changes.
        $this->assertSame('cleanup_pending', $manifestAfterFailure->status);
        $this->assertSame('oauth_identities', $manifestAfterFailure->failure_category);
        $this->assertNull($manifestAfterFailure->completed_at);

        $this->assertSame('completed', $manifestAfterFailure->category_states['share_links']);
        $this->assertSame('failed', $manifestAfterFailure->category_states['oauth_identities']);

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
            $this->assertSame('pending', $manifestAfterFailure->category_states[$category]);
        }

        // Immutable fields (value equality for Carbon objects).
        $this->assertSame($baseline['operation_id'], $manifestAfterFailure->operation_id);
        $this->assertSame($baseline['subject_user_id'], $manifestAfterFailure->subject_user_id);
        $this->assertSame($baseline['ownership_snapshot'], $manifestAfterFailure->ownership_snapshot);
        $this->assertSame($baseline['attempt_count'], $manifestAfterFailure->attempt_count);
        $this->assertEquals($baseline['last_attempt_at'], $manifestAfterFailure->last_attempt_at);
        $this->assertEquals($baseline['completed_at'], $manifestAfterFailure->completed_at);
        $this->assertEquals($baseline['created_at'], $manifestAfterFailure->created_at);

        // Repeat-call behavior (same-category repeat failure is rejected).
        $repeated = $manifestService->markCategoryFailed(
            $manifestAfterFailure,
            'oauth_identities',
        );
        $this->assertFalse($repeated);

        $finalManifest = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($finalManifest);

        $this->assertSame('cleanup_pending', $finalManifest->status);
        $this->assertSame('oauth_identities', $finalManifest->failure_category);
        $this->assertNull($finalManifest->completed_at);
        $this->assertSame('completed', $finalManifest->category_states['share_links']);
        $this->assertSame('failed', $finalManifest->category_states['oauth_identities']);
        foreach ($expectedPendingCategories as $category) {
            $this->assertSame('pending', $finalManifest->category_states[$category]);
        }

        $this->assertSame($baseline['operation_id'], $finalManifest->operation_id);
        $this->assertSame($baseline['subject_user_id'], $finalManifest->subject_user_id);
        $this->assertSame($baseline['ownership_snapshot'], $finalManifest->ownership_snapshot);
        $this->assertSame($baseline['attempt_count'], $finalManifest->attempt_count);
        $this->assertEquals($baseline['last_attempt_at'], $finalManifest->last_attempt_at);
        $this->assertEquals($baseline['completed_at'], $finalManifest->completed_at);
        $this->assertEquals($baseline['created_at'], $finalManifest->created_at);
    }
}

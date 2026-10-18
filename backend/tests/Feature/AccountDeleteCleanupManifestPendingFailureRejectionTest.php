<?php

namespace Tests\Feature;

use App\Models\AccountDeleteCleanupManifest;
use App\Models\User;
use App\Services\AccountDeleteCleanupManifestService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AccountDeleteCleanupManifestPendingFailureRejectionTest extends TestCase
{
    use RefreshDatabase;

    public function test_account_delete_cleanup_manifest_rejects_category_failure_before_attempt_begins(): void
    {
        $subjectUser = User::factory()->create();

        /** @var AccountDeleteCleanupManifestService $manifestService */
        $manifestService = app(AccountDeleteCleanupManifestService::class);

        $manifest = $manifestService->createForUser($subjectUser);

        $pendingManifest = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($pendingManifest);

        $this->assertSame('pending', $pendingManifest->status);
        $this->assertSame(0, $pendingManifest->attempt_count);
        $this->assertNull($pendingManifest->last_attempt_at);
        $this->assertNull($pendingManifest->completed_at);
        $this->assertNull($pendingManifest->failure_category);

        $categoryStates = $pendingManifest->category_states;
        $this->assertIsArray($categoryStates);
        $this->assertCount(10, $categoryStates);
        foreach ($categoryStates as $value) {
            $this->assertSame('pending', $value);
        }

        $this->assertNotNull(User::query()->find($subjectUser->id));

        $baseline = [
            'operation_id' => $pendingManifest->operation_id,
            'subject_user_id' => $pendingManifest->subject_user_id,
            'ownership_snapshot' => $pendingManifest->ownership_snapshot,
            'category_states' => $pendingManifest->category_states,
            'status' => $pendingManifest->status,
            'attempt_count' => $pendingManifest->attempt_count,
            'last_attempt_at' => $pendingManifest->last_attempt_at,
            'completed_at' => $pendingManifest->completed_at,
            'failure_category' => $pendingManifest->failure_category,
            'created_at' => $pendingManifest->created_at,
            'updated_at' => $pendingManifest->updated_at,
        ];

        $failed = $manifestService->markCategoryFailed(
            $pendingManifest,
            'oauth_identities',
        );

        $this->assertFalse($failed);

        $manifestAfterRejectedFailure = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($manifestAfterRejectedFailure);

        $this->assertSame('pending', $manifestAfterRejectedFailure->status);
        $this->assertSame(0, $manifestAfterRejectedFailure->attempt_count);
        $this->assertNull($manifestAfterRejectedFailure->last_attempt_at);
        $this->assertNull($manifestAfterRejectedFailure->completed_at);
        $this->assertNull($manifestAfterRejectedFailure->failure_category);
        $this->assertSame('pending', $manifestAfterRejectedFailure->category_states['oauth_identities']);

        foreach ($manifestAfterRejectedFailure->category_states as $category => $state) {
            $this->assertSame('pending', $state, "Category '{$category}' must remain pending");
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

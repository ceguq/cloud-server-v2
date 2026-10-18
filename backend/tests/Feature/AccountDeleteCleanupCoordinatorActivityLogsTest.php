<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\AccountDeleteCleanupManifest;
use App\Models\ActivityLog;
use App\Models\User;
use App\Services\AccountDeleteCleanupCategoryExecutionResult;
use App\Services\AccountDeleteCleanupCoordinator;
use App\Services\AccountDeleteCleanupManifestService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

final class AccountDeleteCleanupCoordinatorActivityLogsTest extends TestCase
{
    use RefreshDatabase;

    public function test_coordinator_cleans_activity_logs_after_google_drive_credentials(): void
    {
        Http::fake([
            'https://oauth2.googleapis.com/revoke' => Http::response([], 200),
        ]);
        $subject = User::factory()->create();
        $other = User::factory()->create();
        $subjectLog = $this->createLog($subject, 'subject');
        $otherLog = $this->createLog($other, 'other');
        $manifest = $this->inProgressManifest($subject);

        $results = app(AccountDeleteCleanupCoordinator::class)->execute($manifest);

        $this->assertSame(
            [
                'share_links',
                'oauth_identities',
                'physical_local_files',
                'database_records',
                'devices',
                'sanctum_tokens',
                'google_drive_credentials',
                'activity_logs',
                'other_user_owned_resources',
                'user_record',
            ],
            array_map(
                static fn (AccountDeleteCleanupCategoryExecutionResult $result): string => $result->category,
                $results,
            ),
        );
        foreach ($results as $result) {
            $this->assertSame(AccountDeleteCleanupCategoryExecutionResult::OUTCOME_COMPLETED, $result->outcome);
        }
        $this->assertNull(ActivityLog::query()->find($subjectLog->getKey()));
        $this->assertNotNull(ActivityLog::query()->find($otherLog->getKey()));
        $this->assertNull(User::query()->find($subject->getKey()));
        $this->assertNotNull(User::query()->find($other->getKey()));

        $manifestAfter = AccountDeleteCleanupManifest::query()->findOrFail($manifest->getKey());
        $this->assertSame('completed', $manifestAfter->category_states['google_drive_credentials']);
        $this->assertSame('completed', $manifestAfter->category_states['activity_logs']);
        $this->assertSame('completed', $manifestAfter->category_states['other_user_owned_resources']);
        $this->assertSame('completed', $manifestAfter->category_states['user_record']);
        $this->assertSame('completed', $manifestAfter->status);
        $this->assertNotNull($manifestAfter->completed_at);
    }

    public function test_coordinator_stops_when_activity_logs_category_is_rejected(): void
    {
        Http::fake();
        $subject = User::factory()->create();
        $subjectLog = $this->createLog($subject, 'subject');
        $manifestService = new class extends AccountDeleteCleanupManifestService
        {
            public function markCategoryCompleted(
                AccountDeleteCleanupManifest $manifest,
                string $category,
            ): bool {
                if ($category === 'activity_logs') {
                    return false;
                }

                return parent::markCategoryCompleted($manifest, $category);
            }
        };
        app()->instance(AccountDeleteCleanupManifestService::class, $manifestService);
        $manifest = $this->inProgressManifest($subject);

        $results = app(AccountDeleteCleanupCoordinator::class)->execute($manifest);

        $this->assertSame(
            [
                'share_links',
                'oauth_identities',
                'physical_local_files',
                'database_records',
                'devices',
                'sanctum_tokens',
                'google_drive_credentials',
                'activity_logs',
            ],
            array_map(
                static fn (AccountDeleteCleanupCategoryExecutionResult $result): string => $result->category,
                $results,
            ),
        );
        foreach (array_slice($results, 0, -1) as $result) {
            $this->assertSame(AccountDeleteCleanupCategoryExecutionResult::OUTCOME_COMPLETED, $result->outcome);
        }
        $activityLogsResult = $results[array_key_last($results)];
        $this->assertSame(AccountDeleteCleanupCategoryExecutionResult::OUTCOME_BOOKKEEPING_FAILED, $activityLogsResult->outcome);
        $this->assertTrue($activityLogsResult->cleanupExecuted);
        $this->assertFalse($activityLogsResult->categoryCompleted);
        $this->assertNull(ActivityLog::query()->find($subjectLog->getKey()));
        $this->assertNotNull(User::query()->find($subject->getKey()));

        $manifestAfter = AccountDeleteCleanupManifest::query()->findOrFail($manifest->getKey());
        $this->assertSame('pending', $manifestAfter->category_states['activity_logs']);
        $this->assertSame('pending', $manifestAfter->category_states['other_user_owned_resources']);
        $this->assertSame('pending', $manifestAfter->category_states['user_record']);
        $this->assertSame('in_progress', $manifestAfter->status);
        $this->assertNull($manifestAfter->completed_at);
    }

    private function inProgressManifest(User $user): AccountDeleteCleanupManifest
    {
        $manifestService = app(AccountDeleteCleanupManifestService::class);
        $manifest = $manifestService->createForUser($user);
        $this->assertTrue($manifestService->beginAttempt($manifest));

        return AccountDeleteCleanupManifest::query()->findOrFail($manifest->getKey());
    }

    private function createLog(User $user, string $name): ActivityLog
    {
        return ActivityLog::query()->create([
            'user_id' => $user->getKey(),
            'action' => 'test.action',
            'description' => "{$name} activity",
        ]);
    }
}

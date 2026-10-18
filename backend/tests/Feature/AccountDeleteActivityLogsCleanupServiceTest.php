<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\AccountDeleteCleanupManifest;
use App\Models\ActivityLog;
use App\Models\File;
use App\Models\User;
use App\Services\AccountDeleteActivityLogsCleanupService;
use App\Services\AccountDeleteCleanupManifestService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class AccountDeleteActivityLogsCleanupServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_cleanup_deletes_only_subject_owned_logs_and_is_idempotent(): void
    {
        $subject = User::factory()->create();
        $other = User::factory()->create();
        $subjectFile = $this->createFile($subject, 'subject');
        $otherFile = $this->createFile($other, 'other');

        $subjectLogs = [
            $this->createLog($subject, [
                'action' => 'file.download',
                'description' => 'Downloaded subject-report.pdf',
                'subject_type' => File::class,
                'subject_id' => (string) $subjectFile->getKey(),
                'metadata' => ['file_id' => (string) $subjectFile->getKey(), 'original_name' => 'subject-report.pdf'],
                'ip_address' => '192.0.2.1',
                'user_agent' => 'NimbusDrive Test Agent',
            ]),
            $this->createLog($subject, [
                'action' => 'auth.login',
                'description' => 'Successful login',
                'subject_type' => User::class,
                'subject_id' => (string) $subject->getKey(),
                'metadata' => ['email' => $subject->email],
                'ip_address' => '2001:db8::1',
                'user_agent' => 'NimbusDrive Mobile',
            ]),
            $this->createLog($subject, [
                'action' => 'folder.rename',
                'description' => 'Renamed subject folder',
                'subject_type' => 'App\\Models\\Folder',
                'subject_id' => 'folder-123',
                'metadata' => ['folder_id' => 'folder-123', 'old_name' => 'Before', 'new_name' => 'After'],
            ]),
        ];

        $otherLogs = [
            $this->createLog($other, [
                'action' => 'file.download',
                'description' => 'Downloaded other-user.pdf',
                'subject_type' => File::class,
                'subject_id' => (string) $otherFile->getKey(),
                'metadata' => ['file_id' => (string) $otherFile->getKey()],
            ]),
            $this->createLog($other, [
                'action' => 'audit.reference',
                'description' => 'Other-user log with a subject resource reference',
                'subject_type' => File::class,
                'subject_id' => (string) $subjectFile->getKey(),
                'metadata' => ['subject_user_id' => $subject->getKey(), 'email' => $subject->email],
            ]),
        ];
        $unownedLog = $this->createLog(null, [
            'action' => 'audit.unowned_reference',
            'description' => 'Unowned log with a subject user reference',
            'subject_type' => User::class,
            'subject_id' => (string) $subject->getKey(),
            'metadata' => ['email' => $subject->email],
        ]);

        $manifest = $this->eligibleManifest($subject);
        $service = app(AccountDeleteActivityLogsCleanupService::class);

        $firstResult = $service->cleanupWithResult($manifest);
        $secondResult = $service->cleanupWithResult($manifest);

        $this->assertTrue($firstResult->executed);
        $this->assertSame(count($subjectLogs), $firstResult->deletedCount);
        $this->assertTrue($secondResult->executed);
        $this->assertSame(0, $secondResult->deletedCount);
        foreach ($subjectLogs as $log) {
            $this->assertNull(ActivityLog::query()->find($log->getKey()));
        }
        foreach ($otherLogs as $log) {
            $this->assertNotNull(ActivityLog::query()->find($log->getKey()));
        }
        $this->assertNotNull(ActivityLog::query()->find($unownedLog->getKey()));
        $this->assertNotNull(User::query()->find($subject->getKey()));
        $this->assertNotNull(User::query()->find($other->getKey()));
        $this->assertNotNull(File::query()->find($subjectFile->getKey()));
        $this->assertNotNull(File::query()->find($otherFile->getKey()));

        $manifestAfter = AccountDeleteCleanupManifest::query()->findOrFail($manifest->getKey());
        $this->assertSame('in_progress', $manifestAfter->status);
        $this->assertSame('pending', $manifestAfter->category_states['activity_logs']);
        $this->assertNull($manifestAfter->completed_at);
        $this->assertNull($manifestAfter->failure_category);
    }

    public function test_cleanup_executes_successfully_when_subject_has_no_logs(): void
    {
        $subject = User::factory()->create();
        $manifest = $this->eligibleManifest($subject);

        $result = app(AccountDeleteActivityLogsCleanupService::class)
            ->cleanupWithResult($manifest);

        $this->assertTrue($result->executed);
        $this->assertSame(0, $result->deletedCount);
        $this->assertNotNull(User::query()->find($subject->getKey()));
        $this->assertSame(
            'pending',
            AccountDeleteCleanupManifest::query()->findOrFail($manifest->getKey())->category_states['activity_logs'],
        );
    }

    public function test_cleanup_rejects_manifests_that_are_not_eligible(): void
    {
        $service = app(AccountDeleteActivityLogsCleanupService::class);
        $subject = User::factory()->create();
        $log = $this->createLog($subject, ['action' => 'auth.login', 'description' => 'Keep']);

        $manifestService = app(AccountDeleteCleanupManifestService::class);
        $pendingManifest = $manifestService->createForUser($subject);
        $completedCategoryManifest = $this->eligibleManifest($subject);
        $this->assertTrue($manifestService->markCategoryCompleted($completedCategoryManifest, 'activity_logs'));
        $failedManifest = $this->eligibleManifest($subject);
        $failedManifest->failure_category = 'share_links';
        $this->assertTrue($failedManifest->save());

        foreach ([$pendingManifest, $completedCategoryManifest, $failedManifest] as $manifest) {
            $result = $service->cleanupWithResult($manifest);
            $this->assertFalse($result->executed);
            $this->assertSame(0, $result->deletedCount);
        }

        $this->assertNotNull(ActivityLog::query()->find($log->getKey()));
    }

    private function eligibleManifest(User $user): AccountDeleteCleanupManifest
    {
        $manifestService = app(AccountDeleteCleanupManifestService::class);
        $manifest = $manifestService->createForUser($user);
        $this->assertTrue($manifestService->beginAttempt($manifest));

        return AccountDeleteCleanupManifest::query()->findOrFail($manifest->getKey());
    }

    private function createFile(User $user, string $name): File
    {
        return File::query()->create([
            'user_id' => $user->getKey(),
            'folder_id' => null,
            'original_name' => "{$name}.pdf",
            'stored_name' => "{$name}.pdf",
            'path' => "nimbusdrive/{$name}.pdf",
            'mime_type' => 'application/pdf',
            'size' => 10,
        ]);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function createLog(?User $user, array $attributes): ActivityLog
    {
        return ActivityLog::query()->create(array_merge([
            'user_id' => $user?->getKey(),
            'action' => 'test.action',
            'description' => 'Test activity',
            'subject_type' => null,
            'subject_id' => null,
            'metadata' => null,
            'ip_address' => null,
            'user_agent' => null,
        ], $attributes));
    }
}

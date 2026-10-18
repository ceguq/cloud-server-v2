<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\AccountDeleteCleanupManifest;
use App\Models\User;
use App\Services\AccountDeleteCleanupCategoryExecutionResult;
use App\Services\AccountDeleteCleanupCoordinator;
use App\Services\AccountDeleteCleanupManifestService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

final class AccountDeleteCleanupCoordinatorOtherUserOwnedResourcesTest extends TestCase
{
    use RefreshDatabase;

    public function test_coordinator_cleans_residual_resources_after_activity_logs(): void
    {
        Http::fake(['https://oauth2.googleapis.com/revoke' => Http::response([], 200)]);
        $subject = User::factory()->create();
        $other = User::factory()->create();
        $this->createSession('subject-session', $subject->getKey());
        $this->createSession('other-session', $other->getKey());
        $this->createSession('unowned-session', null);
        $this->createPasswordResetToken((string) $subject->email);
        $this->createPasswordResetToken((string) $other->email);
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
        $this->assertDatabaseMissing('sessions', ['id' => 'subject-session']);
        $this->assertDatabaseHas('sessions', ['id' => 'other-session', 'user_id' => $other->getKey()]);
        $this->assertDatabaseHas('sessions', ['id' => 'unowned-session', 'user_id' => null]);
        $this->assertDatabaseMissing('password_reset_tokens', ['email' => $subject->email]);
        $this->assertDatabaseHas('password_reset_tokens', ['email' => $other->email]);
        $this->assertNull(User::query()->find($subject->getKey()));
        $this->assertNotNull(User::query()->find($other->getKey()));
        $manifestAfter = AccountDeleteCleanupManifest::query()->findOrFail($manifest->getKey());
        $this->assertSame('completed', $manifestAfter->category_states['other_user_owned_resources']);
        $this->assertSame('completed', $manifestAfter->category_states['user_record']);
        $this->assertSame('completed', $manifestAfter->status);
        $this->assertNotNull($manifestAfter->completed_at);
    }

    public function test_coordinator_stops_when_residual_resources_bookkeeping_fails(): void
    {
        Http::fake();
        $subject = User::factory()->create();
        $this->createSession('rejected-session', $subject->getKey());
        $this->createPasswordResetToken((string) $subject->email);
        $manifestService = new class extends AccountDeleteCleanupManifestService
        {
            public function markCategoryCompleted(
                AccountDeleteCleanupManifest $manifest,
                string $category,
            ): bool {
                if ($category === 'other_user_owned_resources') {
                    return false;
                }

                return parent::markCategoryCompleted($manifest, $category);
            }
        };
        app()->instance(AccountDeleteCleanupManifestService::class, $manifestService);
        $manifest = $this->inProgressManifest($subject);

        $results = app(AccountDeleteCleanupCoordinator::class)->execute($manifest);

        $this->assertSame('other_user_owned_resources', $results[array_key_last($results)]->category);
        $this->assertSame(
            AccountDeleteCleanupCategoryExecutionResult::OUTCOME_BOOKKEEPING_FAILED,
            $results[array_key_last($results)]->outcome,
        );
        $this->assertTrue($results[array_key_last($results)]->cleanupExecuted);
        $this->assertDatabaseMissing('sessions', ['id' => 'rejected-session']);
        $this->assertDatabaseMissing('password_reset_tokens', ['email' => $subject->email]);
        $this->assertNotNull(User::query()->find($subject->getKey()));
        $manifestAfter = AccountDeleteCleanupManifest::query()->findOrFail($manifest->getKey());
        $this->assertSame('pending', $manifestAfter->category_states['other_user_owned_resources']);
        $this->assertSame('pending', $manifestAfter->category_states['user_record']);
        $this->assertSame('in_progress', $manifestAfter->status);
    }

    private function inProgressManifest(User $user): AccountDeleteCleanupManifest
    {
        $manifestService = app(AccountDeleteCleanupManifestService::class);
        $manifest = $manifestService->createForUser($user);
        $this->assertTrue($manifestService->beginAttempt($manifest));

        return AccountDeleteCleanupManifest::query()->findOrFail($manifest->getKey());
    }

    private function createSession(string $id, ?int $userId): void
    {
        DB::table('sessions')->insert([
            'id' => $id,
            'user_id' => $userId,
            'payload' => 'payload',
            'last_activity' => now()->timestamp,
        ]);
    }

    private function createPasswordResetToken(string $email): void
    {
        DB::table('password_reset_tokens')->insert([
            'email' => $email,
            'token' => hash('sha256', $email),
            'created_at' => now(),
        ]);
    }
}

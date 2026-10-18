<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\AccountDeleteCleanupManifest;
use App\Models\GDriveAccount;
use App\Models\User;
use App\Services\AccountDeleteCleanupCategoryExecutionResult;
use App\Services\AccountDeleteCleanupCoordinator;
use App\Services\AccountDeleteCleanupManifestService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

final class AccountDeleteCleanupCoordinatorGoogleDriveCredentialsTest extends TestCase
{
    use RefreshDatabase;

    public function test_coordinator_cleans_google_drive_credentials_before_activity_logs_and_terminal_user_record(): void
    {
        Http::fake([
            'https://oauth2.googleapis.com/revoke' => Http::response([], 200),
        ]);
        $subject = User::factory()->create();
        $other = User::factory()->create();
        $subjectAccount = $this->createAccount($subject, 'subject@example.com');
        $otherAccount = $this->createAccount($other, 'other@example.com');
        $manifestService = app(AccountDeleteCleanupManifestService::class);
        $manifest = $manifestService->createForUser($subject);
        $this->assertTrue($manifestService->beginAttempt($manifest));

        $results = app(AccountDeleteCleanupCoordinator::class)->execute(
            AccountDeleteCleanupManifest::query()->findOrFail($manifest->getKey()),
        );

        $this->assertSame(
            ['share_links', 'oauth_identities', 'physical_local_files', 'database_records', 'devices', 'sanctum_tokens', 'google_drive_credentials', 'activity_logs', 'other_user_owned_resources', 'user_record'],
            array_map(
                static fn (AccountDeleteCleanupCategoryExecutionResult $result): string => $result->category,
                $results,
            ),
        );
        foreach ($results as $result) {
            $this->assertSame(AccountDeleteCleanupCategoryExecutionResult::OUTCOME_COMPLETED, $result->outcome);
        }
        $this->assertNull(GDriveAccount::query()->find($subjectAccount->id));
        $this->assertNotNull(GDriveAccount::query()->find($otherAccount->id));
        $this->assertNull(User::query()->find($subject->id));
        $this->assertNotNull(User::query()->find($other->id));

        $manifestAfter = AccountDeleteCleanupManifest::query()->findOrFail($manifest->getKey());
        $this->assertSame('completed', $manifestAfter->category_states['sanctum_tokens']);
        $this->assertSame('completed', $manifestAfter->category_states['google_drive_credentials']);
        $this->assertSame('completed', $manifestAfter->category_states['activity_logs']);
        $this->assertSame('completed', $manifestAfter->category_states['other_user_owned_resources']);
        $this->assertSame('completed', $manifestAfter->category_states['user_record']);
        $this->assertSame('completed', $manifestAfter->status);
        $this->assertNotNull($manifestAfter->completed_at);
    }

    private function createAccount(User $user, string $email): GDriveAccount
    {
        return GDriveAccount::query()->create([
            'user_id' => $user->id,
            'email' => $email,
            'access_token' => 'access-secret',
            'refresh_token' => 'refresh-secret',
        ]);
    }
}

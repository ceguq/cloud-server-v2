<?php

namespace Tests\Feature;

use App\Models\AccountDeleteCleanupManifest;
use App\Models\OAuthIdentity;
use App\Models\User;
use App\Services\AccountDeleteCleanupManifestService;
use App\Services\AccountDeleteOAuthIdentitiesCleanupOrchestrator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AccountDeleteOAuthIdentitiesCleanupOrchestratorZeroIdentitiesTest extends TestCase
{
    use RefreshDatabase;

    public function test_orchestrator_marks_oauth_identities_completed_when_eligible_subject_has_no_identities(): void
    {
        $subjectUser = User::factory()->create();
        $protectedUser = User::factory()->create();

        $this->assertNotNull(User::query()->find($subjectUser->id));
        $this->assertNotNull(User::query()->find($protectedUser->id));

        // Subject zero-identity condition: do not create any OAuthIdentity for the subject.
        $this->assertSame(
            0,
            OAuthIdentity::query()->where('user_id', $subjectUser->id)->count(),
        );

        // Protected OAuth identity fixture.
        $protectedIdentity = $protectedUser->oauthIdentities()->create([
            'provider' => 'github',
            'provider_user_id' => 'account-delete-oauth-orchestrator-zero-protected-github',
        ]);

        $this->assertNotNull(OAuthIdentity::query()->find($protectedIdentity->id));

        $protectedIdentityId = (int) $protectedIdentity->id;
        $protectedIdentityUserId = $protectedIdentity->user_id;
        $protectedIdentityProvider = $protectedIdentity->provider;
        $protectedIdentityProviderUserId = $protectedIdentity->provider_user_id;
        $protectedIdentityProviderEmail = $protectedIdentity->provider_email;
        $protectedIdentityAvatarUrl = $protectedIdentity->avatar_url;
        $protectedIdentityCreatedAt = $protectedIdentity->created_at;
        $protectedIdentityUpdatedAt = $protectedIdentity->updated_at;

        // Sanctum-token protection.
        Sanctum::actingAs($subjectUser);
        $subjectToken = $subjectUser->createToken('account-delete-oauth-orchestrator-zero-subject');

        Sanctum::actingAs($protectedUser);
        $protectedToken = $protectedUser->createToken('account-delete-oauth-orchestrator-zero-protected');

        $subjectPersonalAccessTokenId = (int) $subjectToken->accessToken->getKey();
        $protectedPersonalAccessTokenId = (int) $protectedToken->accessToken->getKey();

        $this->assertDatabaseHas('personal_access_tokens', ['id' => $subjectPersonalAccessTokenId]);
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $protectedPersonalAccessTokenId]);

        // Manifest setup.
        $manifestService = app(AccountDeleteCleanupManifestService::class);
        $manifest = $manifestService->createForUser($subjectUser);

        $started = $manifestService->beginAttempt($manifest);
        $this->assertTrue($started);

        $inProgressManifest = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($inProgressManifest);

        $this->assertSame('in_progress', $inProgressManifest->status);
        $this->assertSame(1, (int) $inProgressManifest->attempt_count);
        $this->assertNull($inProgressManifest->completed_at);
        $this->assertNull($inProgressManifest->failure_category);
        $this->assertSame('pending', $inProgressManifest->category_states['oauth_identities']);

        foreach (
            [
                'database_records',
                'physical_local_files',
                'share_links',
                'devices',
                'sanctum_tokens',
                'google_drive_credentials',
                'activity_logs',
                'user_record',
                'other_user_owned_resources',
            ] as $category
        ) {
            $this->assertSame('pending', $inProgressManifest->category_states[$category]);
        }

        // Capture pre-orchestration baseline.
        $baseline = [
            'operation_id' => $inProgressManifest->operation_id,
            'subject_user_id' => $inProgressManifest->subject_user_id,
            'ownership_snapshot' => $inProgressManifest->ownership_snapshot,
            'status' => $inProgressManifest->status,
            'attempt_count' => $inProgressManifest->attempt_count,
            'last_attempt_at' => $inProgressManifest->last_attempt_at,
            'completed_at' => $inProgressManifest->completed_at,
            'failure_category' => $inProgressManifest->failure_category,
            'created_at' => $inProgressManifest->created_at,
            'category_states' => $inProgressManifest->category_states,
        ];

        $orchestrator = app(AccountDeleteOAuthIdentitiesCleanupOrchestrator::class);
        $executed = $orchestrator->execute($inProgressManifest);

        $this->assertTrue($executed);

        // Required resource assertions.
        $this->assertSame(
            0,
            OAuthIdentity::query()->where('user_id', $subjectUser->id)->count(),
        );

        $protectedAfter = OAuthIdentity::query()->find($protectedIdentityId);
        $this->assertNotNull($protectedAfter);

        $this->assertSame($protectedIdentityUserId, $protectedAfter->user_id);
        $this->assertSame($protectedIdentityProvider, $protectedAfter->provider);
        $this->assertSame($protectedIdentityProviderUserId, $protectedAfter->provider_user_id);
        $this->assertSame($protectedIdentityProviderEmail, $protectedAfter->provider_email);
        $this->assertSame($protectedIdentityAvatarUrl, $protectedAfter->avatar_url);
        $this->assertEquals($protectedIdentityCreatedAt, $protectedAfter->created_at);
        $this->assertEquals($protectedIdentityUpdatedAt, $protectedAfter->updated_at);

        $this->assertDatabaseHas('users', ['id' => $subjectUser->id]);
        $this->assertDatabaseHas('users', ['id' => $protectedUser->id]);

        $this->assertDatabaseHas('personal_access_tokens', ['id' => $subjectPersonalAccessTokenId]);
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $protectedPersonalAccessTokenId]);

        // Required bookkeeping assertions.
        $manifestAfterOrchestration = AccountDeleteCleanupManifest::query()->find($inProgressManifest->getKey());
        $this->assertNotNull($manifestAfterOrchestration);

        $this->assertSame('in_progress', $manifestAfterOrchestration->status);
        $this->assertSame(1, (int) $manifestAfterOrchestration->attempt_count);
        $this->assertNull($manifestAfterOrchestration->completed_at);
        $this->assertNull($manifestAfterOrchestration->failure_category);
        $this->assertSame('completed', $manifestAfterOrchestration->category_states['oauth_identities']);

        foreach (
            [
                'database_records',
                'physical_local_files',
                'share_links',
                'devices',
                'sanctum_tokens',
                'google_drive_credentials',
                'activity_logs',
                'user_record',
                'other_user_owned_resources',
            ] as $category
        ) {
            $this->assertSame('pending', $manifestAfterOrchestration->category_states[$category]);
        }

        // Immutable-field assertions (use Carbon value equality).
        $this->assertSame($baseline['operation_id'], $manifestAfterOrchestration->operation_id);
        $this->assertSame($baseline['subject_user_id'], $manifestAfterOrchestration->subject_user_id);
        $this->assertSame($baseline['ownership_snapshot'], $manifestAfterOrchestration->ownership_snapshot);
        $this->assertSame($baseline['status'], $manifestAfterOrchestration->status);
        $this->assertSame($baseline['attempt_count'], $manifestAfterOrchestration->attempt_count);
        $this->assertEquals($baseline['last_attempt_at'], $manifestAfterOrchestration->last_attempt_at);
        $this->assertNull($manifestAfterOrchestration->completed_at);
        $this->assertSame($baseline['failure_category'], $manifestAfterOrchestration->failure_category);
        $this->assertEquals($baseline['created_at'], $manifestAfterOrchestration->created_at);
    }
}

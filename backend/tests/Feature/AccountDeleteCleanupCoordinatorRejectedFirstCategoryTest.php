<?php

namespace Tests\Feature;

use App\Models\AccountDeleteCleanupManifest;
use App\Models\File;
use App\Models\OAuthIdentity;
use App\Models\ShareLink;
use App\Models\User;
use App\Services\AccountDeleteCleanupCategoryExecutionResult;
use App\Services\AccountDeleteCleanupCoordinator;
use App\Services\AccountDeleteCleanupManifestService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class AccountDeleteCleanupCoordinatorRejectedFirstCategoryTest extends TestCase
{
    use RefreshDatabase;

    public function test_coordinator_stops_after_share_links_is_failed_without_executing_oauth_identities(): void
    {
        $authorizedCategories = [
            'database_records',
            'physical_local_files',
            'share_links',
            'devices',
            'oauth_identities',
            'sanctum_tokens',
            'google_drive_credentials',
            'activity_logs',
            'other_user_owned_resources',
            'user_record',
        ];

        $otherPendingCategories = [
            'database_records',
            'physical_local_files',
            'devices',
            'sanctum_tokens',
            'google_drive_credentials',
            'activity_logs',
            'other_user_owned_resources',
            'user_record',
        ];

        $subjectUser = User::factory()->create([
            'email' => 'account-delete-coordinator-rejected-first-subject@example.com',
            'password' => null,
        ]);

        $protectedUser = User::factory()->create([
            'email' => 'account-delete-coordinator-rejected-first-protected@example.com',
            'password' => null,
        ]);

        $this->assertDatabaseHas('users', ['id' => $subjectUser->id]);
        $this->assertDatabaseHas('users', ['id' => $protectedUser->id]);

        $subjectToken = $subjectUser->createToken(
            'account-delete-coordinator-rejected-first-subject-token',
        );
        $protectedToken = $protectedUser->createToken(
            'account-delete-coordinator-rejected-first-protected-token',
        );

        $subjectPersonalAccessTokenId = (int) $subjectToken->accessToken->getKey();
        $protectedPersonalAccessTokenId = (int) $protectedToken->accessToken->getKey();

        $this->assertDatabaseHas('personal_access_tokens', [
            'id' => $subjectPersonalAccessTokenId,
        ]);
        $this->assertDatabaseHas('personal_access_tokens', [
            'id' => $protectedPersonalAccessTokenId,
        ]);

        $subjectFileA = File::create([
            'user_id' => $subjectUser->id,
            'folder_id' => null,
            'original_name' => 'account-delete-coordinator-rejected-first-subject-a.bin',
            'stored_name' => 'account-delete-coordinator-rejected-first-subject-a.bin',
            'path' => 'nimbusdrive/account-delete-coordinator-rejected-first-subject-a.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 10,
        ]);

        $subjectFileB = File::create([
            'user_id' => $subjectUser->id,
            'folder_id' => null,
            'original_name' => 'account-delete-coordinator-rejected-first-subject-b.bin',
            'stored_name' => 'account-delete-coordinator-rejected-first-subject-b.bin',
            'path' => 'nimbusdrive/account-delete-coordinator-rejected-first-subject-b.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 11,
        ]);

        $protectedFile = File::create([
            'user_id' => $protectedUser->id,
            'folder_id' => null,
            'original_name' => 'account-delete-coordinator-rejected-first-protected.bin',
            'stored_name' => 'account-delete-coordinator-rejected-first-protected.bin',
            'path' => 'nimbusdrive/account-delete-coordinator-rejected-first-protected.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 12,
        ]);

        $fileBaselines = [
            (string) $subjectFileA->id => [
                'user_id' => (int) $subjectFileA->user_id,
                'folder_id' => $subjectFileA->folder_id,
                'original_name' => $subjectFileA->original_name,
                'stored_name' => $subjectFileA->stored_name,
                'path' => $subjectFileA->path,
                'mime_type' => $subjectFileA->mime_type,
                'size' => (int) $subjectFileA->size,
                'created_at' => $subjectFileA->created_at,
                'updated_at' => $subjectFileA->updated_at,
                'deleted_at' => $subjectFileA->deleted_at,
            ],
            (string) $subjectFileB->id => [
                'user_id' => (int) $subjectFileB->user_id,
                'folder_id' => $subjectFileB->folder_id,
                'original_name' => $subjectFileB->original_name,
                'stored_name' => $subjectFileB->stored_name,
                'path' => $subjectFileB->path,
                'mime_type' => $subjectFileB->mime_type,
                'size' => (int) $subjectFileB->size,
                'created_at' => $subjectFileB->created_at,
                'updated_at' => $subjectFileB->updated_at,
                'deleted_at' => $subjectFileB->deleted_at,
            ],
            (string) $protectedFile->id => [
                'user_id' => (int) $protectedFile->user_id,
                'folder_id' => $protectedFile->folder_id,
                'original_name' => $protectedFile->original_name,
                'stored_name' => $protectedFile->stored_name,
                'path' => $protectedFile->path,
                'mime_type' => $protectedFile->mime_type,
                'size' => (int) $protectedFile->size,
                'created_at' => $protectedFile->created_at,
                'updated_at' => $protectedFile->updated_at,
                'deleted_at' => $protectedFile->deleted_at,
            ],
        ];

        $this->assertNotNull(File::query()->find($subjectFileA->id));
        $this->assertNotNull(File::query()->find($subjectFileB->id));
        $this->assertNotNull(File::query()->find($protectedFile->id));

        $subjectShareA = ShareLink::create([
            'file_id' => $subjectFileA->id,
            'token' => 'account-delete-coordinator-rejected-first-subject-share-a',
            'expires_at' => null,
            'password' => null,
            'download_count' => 0,
        ]);

        $subjectShareB = ShareLink::create([
            'file_id' => $subjectFileB->id,
            'token' => 'account-delete-coordinator-rejected-first-subject-share-b',
            'expires_at' => Carbon::parse('2035-01-01 00:00:00', 'UTC'),
            'password' => 'subject-share-password-hash',
            'download_count' => 1,
        ]);

        $protectedShare = ShareLink::create([
            'file_id' => $protectedFile->id,
            'token' => 'account-delete-coordinator-rejected-first-protected-share',
            'expires_at' => Carbon::parse('2035-01-02 00:00:00', 'UTC'),
            'password' => 'protected-share-password-hash',
            'download_count' => 7,
        ]);

        $shareLinkBaselines = [
            (string) $subjectShareA->id => [
                'id' => (string) $subjectShareA->id,
                'file_id' => (string) $subjectShareA->file_id,
                'token' => (string) $subjectShareA->token,
                'expires_at' => $subjectShareA->expires_at,
                'password' => $subjectShareA->password,
                'download_count' => (int) $subjectShareA->download_count,
                'created_at' => $subjectShareA->created_at,
                'updated_at' => $subjectShareA->updated_at,
            ],
            (string) $subjectShareB->id => [
                'id' => (string) $subjectShareB->id,
                'file_id' => (string) $subjectShareB->file_id,
                'token' => (string) $subjectShareB->token,
                'expires_at' => $subjectShareB->expires_at,
                'password' => $subjectShareB->password,
                'download_count' => (int) $subjectShareB->download_count,
                'created_at' => $subjectShareB->created_at,
                'updated_at' => $subjectShareB->updated_at,
            ],
            (string) $protectedShare->id => [
                'id' => (string) $protectedShare->id,
                'file_id' => (string) $protectedShare->file_id,
                'token' => (string) $protectedShare->token,
                'expires_at' => $protectedShare->expires_at,
                'password' => $protectedShare->password,
                'download_count' => (int) $protectedShare->download_count,
                'created_at' => $protectedShare->created_at,
                'updated_at' => $protectedShare->updated_at,
            ],
        ];

        $this->assertNotNull(ShareLink::query()->find($subjectShareA->id));
        $this->assertNotNull(ShareLink::query()->find($subjectShareB->id));
        $this->assertNotNull(ShareLink::query()->find($protectedShare->id));

        $subjectGoogle = $subjectUser->oauthIdentities()->create([
            'provider' => 'google',
            'provider_user_id' => 'account-delete-coordinator-rejected-first-subject-google',
            'provider_email' => 'subject-google@example.com',
            'avatar_url' => 'https://example.test/rejected-first-subject-google.png',
        ]);

        $subjectGithub = $subjectUser->oauthIdentities()->create([
            'provider' => 'github',
            'provider_user_id' => 'account-delete-coordinator-rejected-first-subject-github',
            'provider_email' => 'subject-github@example.com',
            'avatar_url' => 'https://example.test/rejected-first-subject-github.png',
        ]);

        $protectedGithub = $protectedUser->oauthIdentities()->create([
            'provider' => 'github',
            'provider_user_id' => 'account-delete-coordinator-rejected-first-protected-github',
            'provider_email' => 'protected-github@example.com',
            'avatar_url' => 'https://example.test/rejected-first-protected-github.png',
        ]);

        $oauthIdentityBaselines = [
            (int) $subjectGoogle->id => [
                'id' => (int) $subjectGoogle->id,
                'user_id' => (int) $subjectGoogle->user_id,
                'provider' => (string) $subjectGoogle->provider,
                'provider_user_id' => (string) $subjectGoogle->provider_user_id,
                'provider_email' => $subjectGoogle->provider_email,
                'avatar_url' => $subjectGoogle->avatar_url,
                'created_at' => $subjectGoogle->created_at,
                'updated_at' => $subjectGoogle->updated_at,
            ],
            (int) $subjectGithub->id => [
                'id' => (int) $subjectGithub->id,
                'user_id' => (int) $subjectGithub->user_id,
                'provider' => (string) $subjectGithub->provider,
                'provider_user_id' => (string) $subjectGithub->provider_user_id,
                'provider_email' => $subjectGithub->provider_email,
                'avatar_url' => $subjectGithub->avatar_url,
                'created_at' => $subjectGithub->created_at,
                'updated_at' => $subjectGithub->updated_at,
            ],
            (int) $protectedGithub->id => [
                'id' => (int) $protectedGithub->id,
                'user_id' => (int) $protectedGithub->user_id,
                'provider' => (string) $protectedGithub->provider,
                'provider_user_id' => (string) $protectedGithub->provider_user_id,
                'provider_email' => $protectedGithub->provider_email,
                'avatar_url' => $protectedGithub->avatar_url,
                'created_at' => $protectedGithub->created_at,
                'updated_at' => $protectedGithub->updated_at,
            ],
        ];

        $this->assertDatabaseHas('oauth_identities', ['id' => $subjectGoogle->id]);
        $this->assertDatabaseHas('oauth_identities', ['id' => $subjectGithub->id]);
        $this->assertDatabaseHas('oauth_identities', ['id' => $protectedGithub->id]);

        $manifestService = app(AccountDeleteCleanupManifestService::class);

        $manifest = $manifestService->createForUser($subjectUser);

        $started = $manifestService->beginAttempt($manifest);

        $this->assertTrue($started);

        $staleInProgressManifest = $manifest->fresh();

        $this->assertNotNull($staleInProgressManifest);
        $this->assertSame('in_progress', $staleInProgressManifest->status);
        $this->assertSame(1, (int) $staleInProgressManifest->attempt_count);
        $this->assertSame('pending', $staleInProgressManifest->category_states['share_links']);
        $this->assertSame('pending', $staleInProgressManifest->category_states['oauth_identities']);
        $this->assertNull($staleInProgressManifest->completed_at);
        $this->assertNull($staleInProgressManifest->failure_category);

        foreach ($otherPendingCategories as $category) {
            $this->assertSame('pending', $staleInProgressManifest->category_states[$category]);
        }

        $freshManifest = $manifest->fresh();

        $shareLinksMarkedFailed = $manifestService->markCategoryFailed(
            $freshManifest,
            'share_links',
        );

        $this->assertTrue($shareLinksMarkedFailed);

        $authoritativeBeforeCoordinator = AccountDeleteCleanupManifest::query()
            ->find($manifest->getKey());

        $this->assertNotNull($authoritativeBeforeCoordinator);
        $this->assertSame('cleanup_pending', $authoritativeBeforeCoordinator->status);
        $this->assertSame(1, (int) $authoritativeBeforeCoordinator->attempt_count);
        $this->assertSame('failed', $authoritativeBeforeCoordinator->category_states['share_links']);
        $this->assertSame('pending', $authoritativeBeforeCoordinator->category_states['oauth_identities']);
        $this->assertNull($authoritativeBeforeCoordinator->completed_at);
        $this->assertSame('share_links', $authoritativeBeforeCoordinator->failure_category);

        foreach ($otherPendingCategories as $category) {
            $this->assertSame('pending', $authoritativeBeforeCoordinator->category_states[$category]);
        }

        $this->assertSame('pending', $staleInProgressManifest->category_states['share_links']);
        $this->assertSame('failed', $authoritativeBeforeCoordinator->category_states['share_links']);
        $this->assertSame($authoritativeBeforeCoordinator->getKey(), $staleInProgressManifest->getKey());
        $this->assertSame($authoritativeBeforeCoordinator->operation_id, $staleInProgressManifest->operation_id);

        $manifestBeforeCoordinator = [
            'operation_id' => $authoritativeBeforeCoordinator->operation_id,
            'subject_user_id' => (int) $authoritativeBeforeCoordinator->subject_user_id,
            'ownership_snapshot' => $authoritativeBeforeCoordinator->ownership_snapshot,
            'category_states' => $authoritativeBeforeCoordinator->category_states,
            'status' => $authoritativeBeforeCoordinator->status,
            'attempt_count' => (int) $authoritativeBeforeCoordinator->attempt_count,
            'last_attempt_at' => $authoritativeBeforeCoordinator->last_attempt_at,
            'completed_at' => $authoritativeBeforeCoordinator->completed_at,
            'failure_category' => $authoritativeBeforeCoordinator->failure_category,
            'created_at' => $authoritativeBeforeCoordinator->created_at,
            'updated_at' => $authoritativeBeforeCoordinator->updated_at,
        ];

        $coordinator = app(AccountDeleteCleanupCoordinator::class);

        $results = $coordinator->execute(
            $staleInProgressManifest,
        );

        $this->assertCount(1, $results);
        $this->assertIsArray($results);
        $this->assertSame([0], array_keys($results));

        $this->assertInstanceOf(
            AccountDeleteCleanupCategoryExecutionResult::class,
            $results[0],
        );
        $this->assertSame('share_links', $results[0]->category);
        $this->assertSame(
            AccountDeleteCleanupCategoryExecutionResult::OUTCOME_REJECTED,
            $results[0]->outcome,
        );
        $this->assertFalse($results[0]->cleanupExecuted);
        $this->assertFalse($results[0]->categoryCompleted);

        foreach ($shareLinkBaselines as $shareLinkId => $shareLinkBaseline) {
            $shareLinkAfter = ShareLink::query()->find($shareLinkId);

            $this->assertNotNull($shareLinkAfter);
            $this->assertSame($shareLinkBaseline['id'], (string) $shareLinkAfter->id);
            $this->assertSame($shareLinkBaseline['file_id'], (string) $shareLinkAfter->file_id);
            $this->assertSame($shareLinkBaseline['token'], $shareLinkAfter->token);
            $this->assertEquals($shareLinkBaseline['expires_at'], $shareLinkAfter->expires_at);
            $this->assertSame($shareLinkBaseline['password'], $shareLinkAfter->password);
            $this->assertSame($shareLinkBaseline['download_count'], (int) $shareLinkAfter->download_count);
            $this->assertEquals($shareLinkBaseline['created_at'], $shareLinkAfter->created_at);
            $this->assertEquals($shareLinkBaseline['updated_at'], $shareLinkAfter->updated_at);
        }

        foreach ($oauthIdentityBaselines as $oauthIdentityId => $oauthIdentityBaseline) {
            $oauthIdentityAfter = OAuthIdentity::query()->find($oauthIdentityId);

            $this->assertNotNull($oauthIdentityAfter);
            $this->assertSame($oauthIdentityBaseline['id'], (int) $oauthIdentityAfter->id);
            $this->assertSame($oauthIdentityBaseline['user_id'], (int) $oauthIdentityAfter->user_id);
            $this->assertSame($oauthIdentityBaseline['provider'], $oauthIdentityAfter->provider);
            $this->assertSame($oauthIdentityBaseline['provider_user_id'], $oauthIdentityAfter->provider_user_id);
            $this->assertSame($oauthIdentityBaseline['provider_email'], $oauthIdentityAfter->provider_email);
            $this->assertSame($oauthIdentityBaseline['avatar_url'], $oauthIdentityAfter->avatar_url);
            $this->assertEquals($oauthIdentityBaseline['created_at'], $oauthIdentityAfter->created_at);
            $this->assertEquals($oauthIdentityBaseline['updated_at'], $oauthIdentityAfter->updated_at);
        }

        $this->assertDatabaseHas('users', ['id' => $subjectUser->id]);
        $this->assertDatabaseHas('users', ['id' => $protectedUser->id]);
        $this->assertDatabaseHas('personal_access_tokens', [
            'id' => $subjectPersonalAccessTokenId,
        ]);
        $this->assertDatabaseHas('personal_access_tokens', [
            'id' => $protectedPersonalAccessTokenId,
        ]);

        foreach ($fileBaselines as $fileId => $fileBaseline) {
            $fileAfter = File::query()->find($fileId);

            $this->assertNotNull($fileAfter);
            $this->assertSame($fileBaseline['user_id'], (int) $fileAfter->user_id);
            $this->assertSame($fileBaseline['folder_id'], $fileAfter->folder_id);
            $this->assertSame($fileBaseline['original_name'], $fileAfter->original_name);
            $this->assertSame($fileBaseline['stored_name'], $fileAfter->stored_name);
            $this->assertSame($fileBaseline['path'], $fileAfter->path);
            $this->assertSame($fileBaseline['mime_type'], $fileAfter->mime_type);
            $this->assertSame($fileBaseline['size'], (int) $fileAfter->size);
            $this->assertEquals($fileBaseline['created_at'], $fileAfter->created_at);
            $this->assertEquals($fileBaseline['updated_at'], $fileAfter->updated_at);
            $this->assertEquals($fileBaseline['deleted_at'], $fileAfter->deleted_at);
        }

        $afterManifest = AccountDeleteCleanupManifest::query()
            ->find($manifest->getKey());

        $this->assertNotNull($afterManifest);
        $this->assertSame('cleanup_pending', $afterManifest->status);
        $this->assertSame(1, (int) $afterManifest->attempt_count);
        $this->assertSame('failed', $afterManifest->category_states['share_links']);
        $this->assertSame('pending', $afterManifest->category_states['oauth_identities']);
        $this->assertNull($afterManifest->completed_at);
        $this->assertSame('share_links', $afterManifest->failure_category);

        foreach ($otherPendingCategories as $category) {
            $this->assertSame('pending', $afterManifest->category_states[$category]);
        }

        foreach (array_filter(
            $authorizedCategories,
            static fn (string $category): bool => $category !== 'share_links',
        ) as $category) {
            $this->assertNotSame('failed', $afterManifest->category_states[$category]);
        }

        $this->assertSame($manifestBeforeCoordinator['operation_id'], $afterManifest->operation_id);
        $this->assertSame($manifestBeforeCoordinator['subject_user_id'], (int) $afterManifest->subject_user_id);
        $this->assertSame($manifestBeforeCoordinator['ownership_snapshot'], $afterManifest->ownership_snapshot);
        $this->assertSame($manifestBeforeCoordinator['category_states'], $afterManifest->category_states);
        $this->assertSame($manifestBeforeCoordinator['status'], $afterManifest->status);
        $this->assertSame($manifestBeforeCoordinator['attempt_count'], (int) $afterManifest->attempt_count);
        $this->assertEquals($manifestBeforeCoordinator['last_attempt_at'], $afterManifest->last_attempt_at);
        $this->assertSame($manifestBeforeCoordinator['completed_at'], $afterManifest->completed_at);
        $this->assertSame($manifestBeforeCoordinator['failure_category'], $afterManifest->failure_category);
        $this->assertEquals($manifestBeforeCoordinator['created_at'], $afterManifest->created_at);
        $this->assertEquals($manifestBeforeCoordinator['updated_at'], $afterManifest->updated_at);
    }
}

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
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AccountDeleteCleanupCoordinatorTest extends TestCase
{
    use RefreshDatabase;

    public function test_coordinator_executes_share_links_then_oauth_identities_then_physical_files_then_database_records_then_devices_then_sanctum_tokens_then_google_drive_credentials(): void
    {
        Storage::fake('local');

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

        $remainingPendingCategories = [
            'other_user_owned_resources',
            'user_record',
        ];

        $subjectUser = User::factory()->create([
            'email' => 'account-delete-coordinator-subject@example.com',
            'password' => null,
        ]);

        $protectedUser = User::factory()->create([
            'email' => 'account-delete-coordinator-protected@example.com',
            'password' => null,
        ]);

        $this->assertDatabaseHas('users', ['id' => $subjectUser->id]);
        $this->assertDatabaseHas('users', ['id' => $protectedUser->id]);

        $subjectToken = $subjectUser->createToken(
            'account-delete-coordinator-subject-token',
        );
        $protectedToken = $protectedUser->createToken(
            'account-delete-coordinator-protected-token',
        );

        $subjectPersonalAccessTokenId = (int) $subjectToken->accessToken->getKey();
        $protectedPersonalAccessTokenId = (int) $protectedToken->accessToken->getKey();

        $this->assertDatabaseHas('personal_access_tokens', [
            'id' => $protectedPersonalAccessTokenId,
        ]);

        $subjectFileA = File::create([
            'user_id' => $subjectUser->id,
            'folder_id' => null,
            'original_name' => 'account-delete-coordinator-subject-a.bin',
            'stored_name' => 'account-delete-coordinator-subject-a.bin',
            'path' => 'nimbusdrive/account-delete-coordinator-subject-a.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 10,
        ]);

        $subjectFileB = File::create([
            'user_id' => $subjectUser->id,
            'folder_id' => null,
            'original_name' => 'account-delete-coordinator-subject-b.bin',
            'stored_name' => 'account-delete-coordinator-subject-b.bin',
            'path' => 'nimbusdrive/account-delete-coordinator-subject-b.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 11,
        ]);

        $protectedFile = File::create([
            'user_id' => $protectedUser->id,
            'folder_id' => null,
            'original_name' => 'account-delete-coordinator-protected.bin',
            'stored_name' => 'account-delete-coordinator-protected.bin',
            'path' => 'nimbusdrive/account-delete-coordinator-protected.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 12,
        ]);
        Storage::disk('local')->put($subjectFileA->path, 'subject file a');
        Storage::disk('local')->put($subjectFileB->path, 'subject file b');
        Storage::disk('local')->put($protectedFile->path, 'protected file');

        $fileBaselines = [
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
            ],
        ];

        $this->assertNotNull(File::query()->find($subjectFileA->id));
        $this->assertNotNull(File::query()->find($subjectFileB->id));
        $this->assertNotNull(File::query()->find($protectedFile->id));

        $subjectShareA = ShareLink::create([
            'file_id' => $subjectFileA->id,
            'token' => 'account-delete-coordinator-subject-share-a',
            'expires_at' => null,
            'password' => null,
            'download_count' => 0,
        ]);

        $subjectShareB = ShareLink::create([
            'file_id' => $subjectFileB->id,
            'token' => 'account-delete-coordinator-subject-share-b',
            'expires_at' => null,
            'password' => null,
            'download_count' => 1,
        ]);

        $protectedShare = ShareLink::create([
            'file_id' => $protectedFile->id,
            'token' => 'account-delete-coordinator-protected-share',
            'expires_at' => Carbon::parse('2035-01-01 00:00:00', 'UTC'),
            'password' => 'protected-share-password-hash',
            'download_count' => 7,
        ]);

        $subjectShareIds = [
            (string) $subjectShareA->id,
            (string) $subjectShareB->id,
        ];

        $protectedShareCaptured = [
            'id' => (string) $protectedShare->id,
            'file_id' => (string) $protectedShare->file_id,
            'token' => (string) $protectedShare->token,
            'expires_at' => $protectedShare->expires_at,
            'password' => $protectedShare->password,
            'download_count' => (int) $protectedShare->download_count,
            'created_at' => $protectedShare->created_at,
            'updated_at' => $protectedShare->updated_at,
        ];

        $this->assertNotNull(ShareLink::query()->find($subjectShareIds[0]));
        $this->assertNotNull(ShareLink::query()->find($subjectShareIds[1]));
        $this->assertNotNull(ShareLink::query()->find($protectedShareCaptured['id']));

        $subjectGoogle = $subjectUser->oauthIdentities()->create([
            'provider' => 'google',
            'provider_user_id' => 'account-delete-coordinator-subject-google',
            'provider_email' => 'subject-google@example.com',
            'avatar_url' => 'https://example.test/subject-google.png',
        ]);

        $subjectGithub = $subjectUser->oauthIdentities()->create([
            'provider' => 'github',
            'provider_user_id' => 'account-delete-coordinator-subject-github',
            'provider_email' => 'subject-github@example.com',
            'avatar_url' => 'https://example.test/subject-github.png',
        ]);

        $protectedGithub = $protectedUser->oauthIdentities()->create([
            'provider' => 'github',
            'provider_user_id' => 'account-delete-coordinator-protected-github',
            'provider_email' => 'protected-github@example.com',
            'avatar_url' => 'https://example.test/protected-github.png',
        ]);

        $protectedIdentityCaptured = [
            'id' => (int) $protectedGithub->id,
            'user_id' => (int) $protectedGithub->user_id,
            'provider' => (string) $protectedGithub->provider,
            'provider_user_id' => (string) $protectedGithub->provider_user_id,
            'provider_email' => $protectedGithub->provider_email,
            'avatar_url' => $protectedGithub->avatar_url,
            'created_at' => $protectedGithub->created_at,
            'updated_at' => $protectedGithub->updated_at,
        ];

        $this->assertDatabaseHas('oauth_identities', ['id' => $subjectGoogle->id]);
        $this->assertDatabaseHas('oauth_identities', ['id' => $subjectGithub->id]);
        $this->assertDatabaseHas('oauth_identities', ['id' => $protectedIdentityCaptured['id']]);

        $manifestService = app(AccountDeleteCleanupManifestService::class);

        $manifest = $manifestService->createForUser($subjectUser);

        $started = $manifestService->beginAttempt($manifest);

        $this->assertTrue($started);

        $inProgressManifest = AccountDeleteCleanupManifest::query()
            ->find($manifest->getKey());

        $this->assertNotNull($inProgressManifest);

        $this->assertSame('in_progress', $inProgressManifest->status);
        $this->assertSame(1, (int) $inProgressManifest->attempt_count);
        $this->assertNull($inProgressManifest->completed_at);
        $this->assertNull($inProgressManifest->failure_category);
        $this->assertSame(
            $authorizedCategories,
            array_keys($inProgressManifest->category_states),
        );
        $this->assertSame('pending', $inProgressManifest->category_states['share_links']);
        $this->assertSame('pending', $inProgressManifest->category_states['oauth_identities']);

        foreach ($remainingPendingCategories as $category) {
            $this->assertSame('pending', $inProgressManifest->category_states[$category]);
        }

        foreach ($authorizedCategories as $category) {
            $this->assertSame('pending', $inProgressManifest->category_states[$category]);
        }

        $manifestBaseline = [
            'operation_id' => $inProgressManifest->operation_id,
            'subject_user_id' => (int) $inProgressManifest->subject_user_id,
            'ownership_snapshot' => $inProgressManifest->ownership_snapshot,
            'status' => $inProgressManifest->status,
            'attempt_count' => (int) $inProgressManifest->attempt_count,
            'last_attempt_at' => $inProgressManifest->last_attempt_at,
            'completed_at' => $inProgressManifest->completed_at,
            'failure_category' => $inProgressManifest->failure_category,
            'created_at' => $inProgressManifest->created_at,
        ];

        $coordinator = app(AccountDeleteCleanupCoordinator::class);

        $results = $coordinator->execute(
            $inProgressManifest,
        );

        $this->assertIsArray($results);
        $this->assertCount(10, $results);
        $this->assertSame([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], array_keys($results));

        $this->assertInstanceOf(
            AccountDeleteCleanupCategoryExecutionResult::class,
            $results[0],
        );
        $this->assertSame('share_links', $results[0]->category);
        $this->assertSame(
            AccountDeleteCleanupCategoryExecutionResult::OUTCOME_COMPLETED,
            $results[0]->outcome,
        );
        $this->assertTrue($results[0]->cleanupExecuted);
        $this->assertTrue($results[0]->categoryCompleted);

        $this->assertInstanceOf(
            AccountDeleteCleanupCategoryExecutionResult::class,
            $results[1],
        );
        $this->assertSame('oauth_identities', $results[1]->category);
        $this->assertSame(
            AccountDeleteCleanupCategoryExecutionResult::OUTCOME_COMPLETED,
            $results[1]->outcome,
        );
        $this->assertTrue($results[1]->cleanupExecuted);
        $this->assertTrue($results[1]->categoryCompleted);

        $this->assertInstanceOf(
            AccountDeleteCleanupCategoryExecutionResult::class,
            $results[2],
        );
        $this->assertSame('physical_local_files', $results[2]->category);
        $this->assertSame(
            AccountDeleteCleanupCategoryExecutionResult::OUTCOME_COMPLETED,
            $results[2]->outcome,
        );
        $this->assertTrue($results[2]->cleanupExecuted);
        $this->assertTrue($results[2]->categoryCompleted);

        $this->assertInstanceOf(
            AccountDeleteCleanupCategoryExecutionResult::class,
            $results[3],
        );
        $this->assertSame('database_records', $results[3]->category);
        $this->assertSame(
            AccountDeleteCleanupCategoryExecutionResult::OUTCOME_COMPLETED,
            $results[3]->outcome,
        );
        $this->assertTrue($results[3]->cleanupExecuted);
        $this->assertTrue($results[3]->categoryCompleted);

        $this->assertInstanceOf(
            AccountDeleteCleanupCategoryExecutionResult::class,
            $results[4],
        );
        $this->assertSame('devices', $results[4]->category);
        $this->assertSame(
            AccountDeleteCleanupCategoryExecutionResult::OUTCOME_COMPLETED,
            $results[4]->outcome,
        );
        $this->assertTrue($results[4]->cleanupExecuted);
        $this->assertTrue($results[4]->categoryCompleted);

        $this->assertInstanceOf(
            AccountDeleteCleanupCategoryExecutionResult::class,
            $results[5],
        );
        $this->assertSame('sanctum_tokens', $results[5]->category);
        $this->assertSame(
            AccountDeleteCleanupCategoryExecutionResult::OUTCOME_COMPLETED,
            $results[5]->outcome,
        );
        $this->assertTrue($results[5]->cleanupExecuted);
        $this->assertTrue($results[5]->categoryCompleted);

        $this->assertInstanceOf(
            AccountDeleteCleanupCategoryExecutionResult::class,
            $results[6],
        );
        $this->assertSame('google_drive_credentials', $results[6]->category);
        $this->assertSame(
            AccountDeleteCleanupCategoryExecutionResult::OUTCOME_COMPLETED,
            $results[6]->outcome,
        );
        $this->assertTrue($results[6]->cleanupExecuted);
        $this->assertTrue($results[6]->categoryCompleted);

        $this->assertInstanceOf(
            AccountDeleteCleanupCategoryExecutionResult::class,
            $results[7],
        );
        $this->assertSame('activity_logs', $results[7]->category);
        $this->assertSame(
            AccountDeleteCleanupCategoryExecutionResult::OUTCOME_COMPLETED,
            $results[7]->outcome,
        );
        $this->assertTrue($results[7]->cleanupExecuted);
        $this->assertTrue($results[7]->categoryCompleted);

        $this->assertSame('other_user_owned_resources', $results[8]->category);
        $this->assertTrue($results[8]->cleanupExecuted);
        $this->assertTrue($results[8]->categoryCompleted);
        $this->assertSame('user_record', $results[9]->category);
        $this->assertTrue($results[9]->cleanupExecuted);
        $this->assertTrue($results[9]->categoryCompleted);

        $this->assertNull(ShareLink::query()->find($subjectShareIds[0]));
        $this->assertNull(ShareLink::query()->find($subjectShareIds[1]));

        $protectedShareAfter = ShareLink::query()
            ->find($protectedShareCaptured['id']);

        $this->assertNotNull($protectedShareAfter);
        $this->assertSame($protectedShareCaptured['file_id'], (string) $protectedShareAfter->file_id);
        $this->assertSame($protectedShareCaptured['token'], $protectedShareAfter->token);
        $this->assertEquals($protectedShareCaptured['expires_at'], $protectedShareAfter->expires_at);
        $this->assertSame($protectedShareCaptured['password'], $protectedShareAfter->password);
        $this->assertSame($protectedShareCaptured['download_count'], (int) $protectedShareAfter->download_count);
        $this->assertEquals($protectedShareCaptured['created_at'], $protectedShareAfter->created_at);
        $this->assertEquals($protectedShareCaptured['updated_at'], $protectedShareAfter->updated_at);

        $this->assertNull(OAuthIdentity::query()->find($subjectGoogle->id));
        $this->assertNull(OAuthIdentity::query()->find($subjectGithub->id));

        $protectedIdentityAfter = OAuthIdentity::query()
            ->find($protectedIdentityCaptured['id']);

        $this->assertNotNull($protectedIdentityAfter);
        $this->assertSame($protectedIdentityCaptured['user_id'], (int) $protectedIdentityAfter->user_id);
        $this->assertSame($protectedIdentityCaptured['provider'], $protectedIdentityAfter->provider);
        $this->assertSame($protectedIdentityCaptured['provider_user_id'], $protectedIdentityAfter->provider_user_id);
        $this->assertSame($protectedIdentityCaptured['provider_email'], $protectedIdentityAfter->provider_email);
        $this->assertSame($protectedIdentityCaptured['avatar_url'], $protectedIdentityAfter->avatar_url);
        $this->assertEquals($protectedIdentityCaptured['created_at'], $protectedIdentityAfter->created_at);
        $this->assertEquals($protectedIdentityCaptured['updated_at'], $protectedIdentityAfter->updated_at);

        $this->assertDatabaseMissing('users', ['id' => $subjectUser->id]);
        $this->assertDatabaseHas('users', ['id' => $protectedUser->id]);
        $this->assertDatabaseMissing('personal_access_tokens', [
            'id' => $subjectPersonalAccessTokenId,
        ]);
        $this->assertDatabaseHas('personal_access_tokens', [
            'id' => $protectedPersonalAccessTokenId,
        ]);

        $this->assertNull(File::withTrashed()->find($subjectFileA->id));
        $this->assertNull(File::withTrashed()->find($subjectFileB->id));
        Storage::disk('local')->assertMissing($subjectFileA->path);
        Storage::disk('local')->assertMissing($subjectFileB->path);
        Storage::disk('local')->assertExists($protectedFile->path);

        $protectedFileAfter = File::query()->find($protectedFile->id);
        $this->assertNotNull($protectedFileAfter);
        $fileBaseline = $fileBaselines[(string) $protectedFile->id];
        $this->assertSame($fileBaseline['user_id'], (int) $protectedFileAfter->user_id);
        $this->assertSame($fileBaseline['folder_id'], $protectedFileAfter->folder_id);
        $this->assertSame($fileBaseline['original_name'], $protectedFileAfter->original_name);
        $this->assertSame($fileBaseline['stored_name'], $protectedFileAfter->stored_name);
        $this->assertSame($fileBaseline['path'], $protectedFileAfter->path);
        $this->assertSame($fileBaseline['mime_type'], $protectedFileAfter->mime_type);
        $this->assertSame($fileBaseline['size'], (int) $protectedFileAfter->size);
        $this->assertEquals($fileBaseline['created_at'], $protectedFileAfter->created_at);
        $this->assertEquals($fileBaseline['updated_at'], $protectedFileAfter->updated_at);

        $afterManifest = AccountDeleteCleanupManifest::query()
            ->find($inProgressManifest->getKey());

        $this->assertNotNull($afterManifest);
        $this->assertSame('completed', $afterManifest->status);
        $this->assertSame(1, (int) $afterManifest->attempt_count);
        $this->assertNotNull($afterManifest->completed_at);
        $this->assertNull($afterManifest->failure_category);
        $this->assertSame('completed', $afterManifest->category_states['share_links']);
        $this->assertSame('completed', $afterManifest->category_states['oauth_identities']);
        $this->assertSame('completed', $afterManifest->category_states['physical_local_files']);
        $this->assertSame('completed', $afterManifest->category_states['database_records']);
        $this->assertSame('completed', $afterManifest->category_states['devices']);
        $this->assertSame('completed', $afterManifest->category_states['sanctum_tokens']);
        $this->assertSame('completed', $afterManifest->category_states['google_drive_credentials']);
        $this->assertSame('completed', $afterManifest->category_states['activity_logs']);
        $this->assertSame('completed', $afterManifest->category_states['other_user_owned_resources']);
        $this->assertSame('completed', $afterManifest->category_states['user_record']);

        foreach ($remainingPendingCategories as $category) {
            $this->assertSame('completed', $afterManifest->category_states[$category]);
        }

        foreach ($authorizedCategories as $category) {
            $this->assertNotSame('failed', $afterManifest->category_states[$category]);
        }

        $this->assertSame($manifestBaseline['operation_id'], $afterManifest->operation_id);
        $this->assertSame($manifestBaseline['subject_user_id'], (int) $afterManifest->subject_user_id);
        $this->assertSame($manifestBaseline['ownership_snapshot'], $afterManifest->ownership_snapshot);
        $this->assertSame($manifestBaseline['attempt_count'], (int) $afterManifest->attempt_count);
        $this->assertEquals($manifestBaseline['last_attempt_at'], $afterManifest->last_attempt_at);
        $this->assertSame($manifestBaseline['failure_category'], $afterManifest->failure_category);
        $this->assertEquals($manifestBaseline['created_at'], $afterManifest->created_at);

        $this->assertSame('completed', $afterManifest->status);
        $this->assertNotNull($afterManifest->completed_at);
    }
}

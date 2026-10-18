<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\AccountDeleteCleanupManifest;
use App\Models\File;
use App\Models\Folder;
use App\Models\OAuthIdentity;
use App\Models\ShareLink;
use App\Models\User;
use App\Services\AccountDeleteCleanupCategoryExecutionResult;
use App\Services\AccountDeleteCleanupCoordinator;
use App\Services\AccountDeleteCleanupManifestService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\PersonalAccessToken;
use Tests\TestCase;

final class AccountDeleteCleanupCoordinatorDatabaseRecordsTest extends TestCase
{
    use RefreshDatabase;

    public function test_coordinator_runs_database_records_after_share_links_before_sanctum_tokens_and_google_drive_credentials(): void
    {
        Storage::fake('local');

        $subjectUser = User::factory()->create();
        $secondUser = User::factory()->create();
        $subjectFolder = Folder::create([
            'name' => 'account-delete-coordinator-database-subject-folder',
            'parent_id' => null,
            'user_id' => $subjectUser->id,
        ]);
        $subjectFile = File::create([
            'user_id' => $subjectUser->id,
            'folder_id' => null,
            'original_name' => 'account-delete-coordinator-database-subject.bin',
            'stored_name' => 'account-delete-coordinator-database-subject.bin',
            'path' => 'nimbusdrive/account-delete-coordinator-database-subject.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 10,
        ]);
        $secondFolder = Folder::create([
            'name' => 'account-delete-coordinator-database-second-folder',
            'parent_id' => null,
            'user_id' => $secondUser->id,
        ]);
        $secondFile = File::create([
            'user_id' => $secondUser->id,
            'folder_id' => null,
            'original_name' => 'account-delete-coordinator-database-second.bin',
            'stored_name' => 'account-delete-coordinator-database-second.bin',
            'path' => 'nimbusdrive/account-delete-coordinator-database-second.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 11,
        ]);
        $subjectShareLink = ShareLink::create([
            'file_id' => $subjectFile->id,
            'token' => 'account-delete-coordinator-database-subject-share',
            'expires_at' => null,
            'password' => null,
            'download_count' => 0,
        ]);
        $subjectIdentity = $subjectUser->oauthIdentities()->create([
            'provider' => 'google',
            'provider_user_id' => 'account-delete-coordinator-database-subject-google',
        ]);
        $secondIdentity = $secondUser->oauthIdentities()->create([
            'provider' => 'google',
            'provider_user_id' => 'account-delete-coordinator-database-second-google',
        ]);
        $subjectToken = $subjectUser->createToken('account-delete-coordinator-database-subject');
        $secondUserToken = $secondUser->createToken('account-delete-coordinator-database-second');
        Storage::disk('local')->put($subjectFile->path, 'subject file');
        Storage::disk('local')->put($secondFile->path, 'second user file');

        $manifestService = app(AccountDeleteCleanupManifestService::class);
        $manifest = $manifestService->createForUser($subjectUser);
        $this->assertTrue($manifestService->beginAttempt($manifest));
        $inProgressManifest = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($inProgressManifest);

        $results = app(AccountDeleteCleanupCoordinator::class)->execute($inProgressManifest);

        $this->assertCount(10, $results);
        $this->assertSame(
            ['share_links', 'oauth_identities', 'physical_local_files', 'database_records', 'devices', 'sanctum_tokens', 'google_drive_credentials', 'activity_logs', 'other_user_owned_resources', 'user_record'],
            array_map(static fn (AccountDeleteCleanupCategoryExecutionResult $result): string => $result->category, $results),
        );
        foreach ($results as $result) {
            $this->assertSame(AccountDeleteCleanupCategoryExecutionResult::OUTCOME_COMPLETED, $result->outcome);
            $this->assertTrue($result->cleanupExecuted);
            $this->assertTrue($result->categoryCompleted);
        }

        $this->assertNull(ShareLink::query()->find($subjectShareLink->id));
        Storage::disk('local')->assertMissing($subjectFile->path);
        Storage::disk('local')->assertExists($secondFile->path);
        $this->assertNull(File::withTrashed()->find($subjectFile->id));
        $this->assertNull(Folder::withTrashed()->find($subjectFolder->id));
        $this->assertNotNull(File::withTrashed()->find($secondFile->id));
        $this->assertNotNull(Folder::withTrashed()->find($secondFolder->id));
        $this->assertNull(OAuthIdentity::query()->find($subjectIdentity->id));
        $this->assertNotNull(OAuthIdentity::query()->find($secondIdentity->id));
        $this->assertNull(PersonalAccessToken::query()->find($subjectToken->accessToken->getKey()));
        $this->assertNotNull(PersonalAccessToken::query()->find($secondUserToken->accessToken->getKey()));
        $this->assertNull(User::query()->find($subjectUser->id));
        $this->assertNotNull(User::query()->find($secondUser->id));

        $manifestAfterCleanup = $inProgressManifest->fresh();
        $this->assertNotNull($manifestAfterCleanup);
        $this->assertSame('completed', $manifestAfterCleanup->status);
        $this->assertSame('completed', $manifestAfterCleanup->category_states['share_links']);
        $this->assertSame('completed', $manifestAfterCleanup->category_states['physical_local_files']);
        $this->assertSame('completed', $manifestAfterCleanup->category_states['database_records']);
        $this->assertSame('completed', $manifestAfterCleanup->category_states['oauth_identities']);
        $this->assertSame('completed', $manifestAfterCleanup->category_states['devices']);
        $this->assertSame('completed', $manifestAfterCleanup->category_states['sanctum_tokens']);
        $this->assertSame('completed', $manifestAfterCleanup->category_states['google_drive_credentials']);
        $this->assertSame('completed', $manifestAfterCleanup->category_states['activity_logs']);
        $this->assertSame('completed', $manifestAfterCleanup->category_states['other_user_owned_resources']);
        $this->assertSame('completed', $manifestAfterCleanup->category_states['user_record']);
        $this->assertNotNull($manifestAfterCleanup->completed_at);
        $this->assertNull($manifestAfterCleanup->failure_category);
    }

    public function test_coordinator_skips_completed_physical_and_database_categories_and_finishes_cleanup(): void
    {
        $subjectUser = User::factory()->create();
        $subjectToken = $subjectUser->createToken('account-delete-coordinator-database-rejected');

        $manifestService = app(AccountDeleteCleanupManifestService::class);
        $manifest = $manifestService->createForUser($subjectUser);
        $this->assertTrue($manifestService->beginAttempt($manifest));
        $this->assertTrue($manifestService->markCategoryCompleted($manifest, 'physical_local_files'));
        $this->assertTrue($manifestService->markCategoryCompleted($manifest, 'database_records'));

        $completedCategories = AccountDeleteCleanupManifest::query()->find($manifest->getKey());
        $this->assertNotNull($completedCategories);
        $this->assertSame('in_progress', $completedCategories->status);
        $this->assertSame('completed', $completedCategories->category_states['physical_local_files']);
        $this->assertSame('completed', $completedCategories->category_states['database_records']);
        $this->assertSame('pending', $completedCategories->category_states['sanctum_tokens']);

        $results = app(AccountDeleteCleanupCoordinator::class)->execute($completedCategories);

        $this->assertSame(
            ['share_links', 'oauth_identities', 'physical_local_files', 'database_records', 'devices', 'sanctum_tokens', 'google_drive_credentials', 'activity_logs', 'other_user_owned_resources', 'user_record'],
            array_map(static fn (AccountDeleteCleanupCategoryExecutionResult $result): string => $result->category, $results),
        );
        foreach ($results as $result) {
            $this->assertSame(AccountDeleteCleanupCategoryExecutionResult::OUTCOME_COMPLETED, $result->outcome);
        }
        $this->assertFalse($results[2]->cleanupExecuted);
        $this->assertFalse($results[3]->cleanupExecuted);
        $this->assertNull(PersonalAccessToken::query()->find($subjectToken->accessToken->getKey()));
        $this->assertNull(User::query()->find($subjectUser->id));

        $manifestAfterCleanup = $completedCategories->fresh();
        $this->assertNotNull($manifestAfterCleanup);
        $this->assertSame('completed', $manifestAfterCleanup->status);
        $this->assertSame('completed', $manifestAfterCleanup->category_states['physical_local_files']);
        $this->assertSame('completed', $manifestAfterCleanup->category_states['database_records']);
        $this->assertSame('completed', $manifestAfterCleanup->category_states['sanctum_tokens']);
        $this->assertSame('completed', $manifestAfterCleanup->category_states['user_record']);
    }

    public function test_physical_file_bookkeeping_failure_prevents_database_records_and_later_categories_from_running(): void
    {
        Storage::fake('local');
        $subjectUser = User::factory()->create();
        $subjectFolder = Folder::create([
            'name' => 'account-delete-coordinator-physical-rejected-folder',
            'parent_id' => null,
            'user_id' => $subjectUser->id,
        ]);
        $subjectFile = File::create([
            'user_id' => $subjectUser->id,
            'folder_id' => null,
            'original_name' => 'account-delete-coordinator-physical-rejected.bin',
            'stored_name' => 'account-delete-coordinator-physical-rejected.bin',
            'path' => 'nimbusdrive/account-delete-coordinator-physical-bookkeeping-failure.bin',
            'mime_type' => 'application/octet-stream',
            'size' => 10,
        ]);
        Storage::disk('local')->put($subjectFile->path, 'removed before bookkeeping failure');
        $subjectToken = $subjectUser->createToken('account-delete-coordinator-physical-bookkeeping-failure');

        $manifestService = new class extends AccountDeleteCleanupManifestService
        {
            public function markCategoryCompleted(
                AccountDeleteCleanupManifest $manifest,
                string $category,
            ): bool {
                if ($category === 'physical_local_files') {
                    return false;
                }

                return parent::markCategoryCompleted($manifest, $category);
            }
        };
        app()->instance(AccountDeleteCleanupManifestService::class, $manifestService);
        $manifest = $manifestService->createForUser($subjectUser);
        $this->assertTrue($manifestService->beginAttempt($manifest));
        $inProgressManifest = AccountDeleteCleanupManifest::query()->findOrFail($manifest->getKey());

        $results = app(AccountDeleteCleanupCoordinator::class)->execute($inProgressManifest);

        $this->assertSame(
            ['share_links', 'oauth_identities', 'physical_local_files'],
            array_map(static fn (AccountDeleteCleanupCategoryExecutionResult $result): string => $result->category, $results),
        );
        $this->assertSame(AccountDeleteCleanupCategoryExecutionResult::OUTCOME_BOOKKEEPING_FAILED, $results[2]->outcome);
        $this->assertTrue($results[2]->cleanupExecuted);
        $this->assertFalse($results[2]->categoryCompleted);
        $this->assertNotNull(File::withTrashed()->find($subjectFile->id));
        $this->assertNotNull(Folder::withTrashed()->find($subjectFolder->id));
        $this->assertNotNull(PersonalAccessToken::query()->find($subjectToken->accessToken->getKey()));
        $this->assertNotNull(User::query()->find($subjectUser->id));
        Storage::disk('local')->assertMissing($subjectFile->path);
    }
}

<?php

namespace Tests\Feature;

use App\Models\AccountDeleteCleanupManifest;
use App\Models\OAuthIdentity;
use App\Models\User;
use App\Services\AccountDeleteCleanupManifestService;
use App\Services\AccountDeleteOAuthIdentitiesCleanupResult;
use App\Services\AccountDeleteOAuthIdentitiesCleanupService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AccountDeleteOAuthIdentitiesCleanupServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_oauth_identities_cleanup_deletes_only_subject_user_identities_and_is_idempotent(): void
    {
        // NOTE: This test is expected to be RED because the intended production classes
        // (AccountDeleteOAuthIdentitiesCleanupService/Result) do not exist yet.

        // Shared cache config for any cache-backed manifest components.
        Cache::store(config('cache.default', 'file'));

        $subjectUser = User::factory()->create([
            'email' => 'subject-oauth@example.com',
            'password' => null,
        ]);

        $protectedUser = User::factory()->create([
            'email' => 'protected-oauth@example.com',
            'password' => null,
        ]);

        // Assert both users exist.
        $this->assertDatabaseHas('users', ['id' => $subjectUser->id]);
        $this->assertDatabaseHas('users', ['id' => $protectedUser->id]);

        // OAuth identities for subject.
        $subjectGoogle = $subjectUser->oauthIdentities()->create([
            'provider' => 'google',
            'provider_user_id' => 'account-delete-oauth-subject-google',
            'provider_email' => 'subject-google@example.com',
            'avatar_url' => 'https://example.test/avatar-subject-google',
        ]);

        $subjectGithub = $subjectUser->oauthIdentities()->create([
            'provider' => 'github',
            'provider_user_id' => 'account-delete-oauth-subject-github',
            'provider_email' => 'subject-github@example.com',
            'avatar_url' => 'https://example.test/avatar-subject-github',
        ]);

        // OAuth identity for protected user.
        $protectedGoogle = $protectedUser->oauthIdentities()->create([
            'provider' => 'google',
            'provider_user_id' => 'account-delete-oauth-protected-google',
            'provider_email' => 'protected-google@example.com',
            'avatar_url' => 'https://example.test/avatar-protected-google',
        ]);

        // Assert all three rows exist.
        $this->assertNotNull(OAuthIdentity::query()->find($subjectGoogle->id));
        $this->assertNotNull(OAuthIdentity::query()->find($subjectGithub->id));
        $this->assertNotNull(OAuthIdentity::query()->find($protectedGoogle->id));

        // Sanctum token protection.
        Sanctum::actingAs($subjectUser);
        $subjectToken = $subjectUser->createToken('account-delete-reauth-subject');

        Sanctum::actingAs($protectedUser);
        $protectedToken = $protectedUser->createToken('account-delete-reauth-protected');

        // Capture token row IDs (personal_access_tokens.id is the token record id).
        $subjectPersonalAccessTokenId = (int) $subjectToken->accessToken->getKey();
        $protectedPersonalAccessTokenId = (int) $protectedToken->accessToken->getKey();

        $this->assertDatabaseHas('personal_access_tokens', [
            'id' => $subjectPersonalAccessTokenId,
        ]);
        $this->assertDatabaseHas('personal_access_tokens', [
            'id' => $protectedPersonalAccessTokenId,
        ]);

        // Optional Google Drive credential protection (only if safe fixtureable).
        // If GDriveAccount cannot be safely instantiated without inventing fields,
        // this fixture should be omitted; do not call any external APIs.
        $gdriveAccount = null;
        try {
            // Minimal safe fields based on migration/model.
            $gdriveAccount = GDriveAccount::query()->create([
                'user_id' => $subjectUser->id,
                'label' => 'subject-drive',
                'email' => 'gdrive-subject@example.com',
                'google_account_id' => 'gdrive-subject-google-id',
                'avatar_url' => 'https://example.test/avatar-gdrive-subject',
                'access_token' => encrypt('access-token-placeholder'),
                'refresh_token' => encrypt('refresh-token-placeholder'),
                'token_expires_at' => now()->addDay(),
                'scopes' => ['drive.readonly'],
                'connected_at' => now(),
                'last_synced_at' => now(),
                'revoked_at' => null,
            ]);

            $this->assertDatabaseHas('gdrive_accounts', [
                'id' => $gdriveAccount->id,
                'user_id' => $subjectUser->id,
            ]);
        } catch (\Throwable) {
            $gdriveAccount = null;
        }

        $gdriveAccountId = $gdriveAccount?->id;
        $gdriveAccountSnapshot = $gdriveAccount
            ? $gdriveAccount->getAttributes()
            : null;

        $manifestService = app(AccountDeleteCleanupManifestService::class);
        $manifest = $manifestService->createForUser($subjectUser);

        $started = $manifestService->beginAttempt($manifest);
        $this->assertTrue($started);

        $freshManifest = app(AccountDeleteCleanupManifest::class)
            ->newQuery()
            ->where('operation_id', $manifest->operation_id)
            ->firstOrFail();

        // Reload and assert baseline manifest state.
        $this->assertSame('in_progress', $freshManifest->status);
        $this->assertSame(1, (int) $freshManifest->attempt_count);
        $this->assertNull($freshManifest->completed_at);
        $this->assertNull($freshManifest->failure_category);

        $categoryStates = is_string($freshManifest->category_states)
            ? json_decode($freshManifest->category_states, true)
            : $freshManifest->category_states;

        $this->assertArrayHasKey('oauth_identities', $categoryStates);
        $this->assertSame('pending', $categoryStates['oauth_identities']);

        // Assert other authorized category states remain pending.
        foreach ($categoryStates as $category => $state) {
            if ($category === 'oauth_identities') {
                continue;
            }
            // In this first eligible contract test, all other categories must be pending.
            $this->assertSame('pending', $state);
        }

        // Capture manifest baseline fields.
        $baseline = [
            'operation_id' => $freshManifest->operation_id,
            'subject_user_id' => $freshManifest->subject_user_id,
            'ownership_snapshot' => $freshManifest->ownership_snapshot,
            'category_states' => $freshManifest->category_states,
            'status' => $freshManifest->status,
            'attempt_count' => $freshManifest->attempt_count,
            'last_attempt_at' => $freshManifest->last_attempt_at,
            'completed_at' => $freshManifest->completed_at,
            'failure_category' => $freshManifest->failure_category,
            'created_at' => $freshManifest->created_at,
            'updated_at' => $freshManifest->updated_at,
        ];

        // First eligible cleanup.
        $cleanupService = app(AccountDeleteOAuthIdentitiesCleanupService::class);
        $firstResult = $cleanupService->cleanupWithResult($freshManifest);

        // Expected result contract.
        $this->assertInstanceOf(AccountDeleteOAuthIdentitiesCleanupResult::class, $firstResult);
        $this->assertTrue($firstResult->executed);
        $this->assertSame(2, $firstResult->deletedCount);

        // Assert subject Google identity and subject GitHub identity are deleted.
        $this->assertNull(OAuthIdentity::query()->find($subjectGoogle->id));
        $this->assertNull(OAuthIdentity::query()->find($subjectGithub->id));

        // Assert protected OAuth identity remains.
        $this->assertNotNull(OAuthIdentity::query()->find($protectedGoogle->id));

        $protectedGoogleFresh = OAuthIdentity::query()->findOrFail($protectedGoogle->id);
        $this->assertSame('google', $protectedGoogleFresh->provider);
        $this->assertSame('account-delete-oauth-protected-google', $protectedGoogleFresh->provider_user_id);

        // Assert both users remain.
        $this->assertDatabaseHas('users', ['id' => $subjectUser->id]);
        $this->assertDatabaseHas('users', ['id' => $protectedUser->id]);

        // Assert Sanctum tokens remain.
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $subjectPersonalAccessTokenId]);
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $protectedPersonalAccessTokenId]);

        // Optional GDrive account remains unchanged.
        if ($gdriveAccountId !== null) {
            $this->assertDatabaseHas('gdrive_accounts', [
                'id' => $gdriveAccountId,
                'user_id' => $subjectUser->id,
            ]);

            $gdriveFresh = GDriveAccount::query()->findOrFail($gdriveAccountId);
            $this->assertSame(
                $gdriveAccountSnapshot['label'] ?? null,
                $gdriveFresh->label,
            );
            $this->assertSame(
                $gdriveAccountSnapshot['email'] ?? null,
                $gdriveFresh->email,
            );
            $this->assertSame(
                $gdriveAccountSnapshot['google_account_id'] ?? null,
                $gdriveFresh->google_account_id,
            );
        }

        // Reload manifest and assert immutability.
        $manifestAfterFirst = app(AccountDeleteCleanupManifest::class)
            ->newQuery()
            ->where('operation_id', $baseline['operation_id'])
            ->firstOrFail();

        $this->assertSame('in_progress', $manifestAfterFirst->status);
        $this->assertSame(1, (int) $manifestAfterFirst->attempt_count);
        $this->assertNull($manifestAfterFirst->completed_at);
        $this->assertNull($manifestAfterFirst->failure_category);

        $afterCategoryStates = is_string($manifestAfterFirst->category_states)
            ? json_decode($manifestAfterFirst->category_states, true)
            : $manifestAfterFirst->category_states;
        $this->assertSame('pending', $afterCategoryStates['oauth_identities']);

        $this->assertEquals($baseline['updated_at'], $manifestAfterFirst->updated_at);

        $this->assertEquals($baseline['category_states'], $manifestAfterFirst->category_states);
        $this->assertEquals($baseline['ownership_snapshot'], $manifestAfterFirst->ownership_snapshot);

        // Second eligible cleanup (idempotency).
        $secondResult = $cleanupService->cleanupWithResult($manifestAfterFirst);

        $this->assertInstanceOf(AccountDeleteOAuthIdentitiesCleanupResult::class, $secondResult);
        $this->assertTrue($secondResult->executed);
        $this->assertSame(0, $secondResult->deletedCount);

        // Protected records remain.
        $this->assertNotNull(OAuthIdentity::query()->find($protectedGoogle->id));
        $this->assertDatabaseHas('users', ['id' => $subjectUser->id]);
        $this->assertDatabaseHas('users', ['id' => $protectedUser->id]);
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $subjectPersonalAccessTokenId]);
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $protectedPersonalAccessTokenId]);

        if ($gdriveAccountId !== null) {
            $gdriveFreshAgain = GDriveAccount::query()->findOrFail($gdriveAccountId);
            $this->assertSame(
                $gdriveAccountSnapshot['label'] ?? null,
                $gdriveFreshAgain->label,
            );
        }

        $manifestAfterSecond = app(AccountDeleteCleanupManifest::class)
            ->newQuery()
            ->where('operation_id', $baseline['operation_id'])
            ->firstOrFail();

        // Manifest bookkeeping must remain unchanged.
        $this->assertSame('in_progress', $manifestAfterSecond->status);
        $this->assertSame(1, (int) $manifestAfterSecond->attempt_count);
        $this->assertNull($manifestAfterSecond->completed_at);
        $this->assertNull($manifestAfterSecond->failure_category);
        $this->assertEquals($baseline['category_states'], $manifestAfterSecond->category_states);
        $this->assertEquals($baseline['ownership_snapshot'], $manifestAfterSecond->ownership_snapshot);
        $this->assertEquals($baseline['updated_at'], $manifestAfterSecond->updated_at);

    }
}

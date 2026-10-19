<?php

namespace Tests\Feature;

use App\Http\Controllers\GDriveController;
use App\Models\GDriveAccount;
use App\Models\User;
use App\Services\GoogleDriveService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Testing\TestResponse;
use Mockery;
use RuntimeException;
use Tests\TestCase;

class GDriveReconnectTest extends TestCase
{
    use RefreshDatabase;

    private string $cachePath;

    protected function setUp(): void
    {
        parent::setUp();

        $this->cachePath = storage_path('framework/cache/data/gdrive-reconnect-tests-'.bin2hex(random_bytes(8)));
        File::ensureDirectoryExists($this->cachePath);

        config([
            'cache.default' => 'file',
            'cache.stores.file.path' => $this->cachePath,
            'cache.stores.file.lock_path' => $this->cachePath,
            'services.google_drive.client_id' => 'test-client-id',
            'services.google_drive.client_secret' => 'test-client-secret',
            'services.google_drive.redirect_uri' => 'http://localhost/api/gdrive/callback',
            'services.google_drive.scopes' => ['https://www.googleapis.com/auth/drive'],
            'app.frontend_url' => 'http://localhost:5173',
        ]);
    }

    protected function tearDown(): void
    {
        File::deleteDirectory($this->cachePath);
        parent::tearDown();
    }

    public function test_reconnect_reuses_the_existing_account_and_replaces_credentials(): void
    {
        $user = User::factory()->create();
        $account = $this->revokedAccount($user, 'stable-google-id');
        $otherAccount = $this->revokedAccount($user, 'another-google-id', 'other@example.com');
        $state = $this->startReconnect($user, $account);
        $this->fakeGoogleOAuth('stable-google-id', 'new@example.com');

        $this->completeCallback($state, [
            'account_id' => $otherAccount->id,
        ])->assertRedirect('http://localhost:5173/gdrive?gdrive=connected');

        $this->assertDatabaseCount('gdrive_accounts', 2);
        $reconnected = $account->fresh();
        $this->assertSame('new@example.com', $reconnected->email);
        $this->assertSame('stable-google-id', $reconnected->google_account_id);
        $this->assertSame('new-access-token', $reconnected->access_token);
        $this->assertSame('new-refresh-token', $reconnected->refresh_token);
        $this->assertNull($reconnected->revoked_at);
        $this->assertSame('other@example.com', $otherAccount->fresh()->email);
        $this->assertSame('another-google-id', $otherAccount->fresh()->google_account_id);
    }

    public function test_user_cannot_start_reconnect_for_another_users_account(): void
    {
        $owner = User::factory()->create();
        $otherUser = User::factory()->create();
        $account = $this->revokedAccount($owner, 'stable-google-id');

        $this->actingAs($otherUser, 'sanctum')
            ->postJson('/api/gdrive/accounts/'.$account->id.'/reconnect')
            ->assertNotFound();

        $this->assertNotNull($account->fresh()->revoked_at);
    }

    public function test_reconnect_state_cannot_be_replayed(): void
    {
        $user = User::factory()->create();
        $account = $this->revokedAccount($user, 'stable-google-id');
        $state = $this->startReconnect($user, $account);
        $this->fakeGoogleOAuth('stable-google-id');

        $this->completeCallback($state)->assertRedirect();

        $this->completeCallback($state)->assertStatus(400);
        $this->assertDatabaseCount('gdrive_accounts', 1);
    }

    public function test_tampered_reconnect_state_is_rejected_without_changing_accounts(): void
    {
        $user = User::factory()->create();
        $account = $this->revokedAccount($user, 'stable-google-id');
        $state = $this->startReconnect($user, $account);
        $tamperedState = substr($state, 0, -1).($state[-1] === '0' ? '1' : '0');

        $this->completeCallback($tamperedState)->assertStatus(400);

        $this->assertDatabaseCount('gdrive_accounts', 1);
        $this->assertNotNull($account->fresh()->revoked_at);
        Http::assertNothingSent();
    }

    public function test_reconnect_rejects_a_different_google_identity(): void
    {
        $user = User::factory()->create();
        $account = $this->revokedAccount($user, 'stable-google-id');
        $state = $this->startReconnect($user, $account);
        $this->fakeGoogleOAuth('different-google-id', 'different@example.com');

        $this->completeCallback($state)->assertStatus(409);

        $this->assertDatabaseCount('gdrive_accounts', 1);
        $this->assertNotNull($account->fresh()->revoked_at);
        $this->assertNull($account->fresh()->access_token);
        $this->assertNull($account->fresh()->refresh_token);
    }

    public function test_reconnect_rejects_legacy_accounts_without_stable_google_identity(): void
    {
        $user = User::factory()->create();
        $account = $this->revokedAccount($user, null);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/gdrive/accounts/'.$account->id.'/reconnect')
            ->assertUnprocessable();

        $this->assertDatabaseCount('gdrive_accounts', 1);
    }

    public function test_normal_add_account_oauth_flow_still_creates_an_account(): void
    {
        $user = User::factory()->create();
        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/gdrive/connect')
            ->assertOk()
            ->assertJsonStructure(['url']);
        $state = $this->oauthStateFromUrl($response->json('url'));
        $this->fakeGoogleOAuth('new-google-id', 'new@example.com');

        $this->completeCallback($state)->assertRedirect();

        $this->assertDatabaseCount('gdrive_accounts', 1);
        $this->assertDatabaseHas('gdrive_accounts', [
            'user_id' => $user->id,
            'email' => 'new@example.com',
            'google_account_id' => 'new-google-id',
            'revoked_at' => null,
        ]);
    }

    public function test_drive_browsing_remains_available_only_to_the_account_owner(): void
    {
        $owner = User::factory()->create();
        $otherUser = User::factory()->create();
        $account = GDriveAccount::query()->create([
            'user_id' => $owner->id,
            'email' => 'owner@example.com',
            'google_account_id' => 'stable-google-id',
        ]);

        $service = Mockery::mock(GoogleDriveService::class);
        $service->shouldReceive('listFiles')
            ->once()
            ->andReturn([
                'files' => [[
                    'id' => 'drive-file-1',
                    'name' => 'example.txt',
                    'mimeType' => 'text/plain',
                ]],
            ]);
        $this->app->instance(GoogleDriveService::class, $service);

        $this->actingAs($owner, 'sanctum')
            ->getJson('/api/gdrive/accounts/'.$account->id.'/files')
            ->assertOk()
            ->assertJsonPath('data.0.id', 'drive-file-1')
            ->assertJsonPath('meta.account_id', $account->id);

        $this->actingAs($otherUser, 'sanctum')
            ->getJson('/api/gdrive/accounts/'.$account->id.'/files')
            ->assertNotFound();
    }

    public function test_trash_returns_reconnect_contract_for_insufficient_scope_errors(): void
    {
        $user = new class {
            public string $id = 'user-1';
        };

        $account = new class extends GDriveAccount {
            public string $id = 'account-1';
            public string $user_id = 'user-1';
            public ?string $revoked_at = null;

            public function __construct()
            {
                parent::__construct();
                $this->id = 'account-1';
            }
        };

        $request = new class($user) extends Request {
            public function __construct(private object $user)
            {
                parent::__construct();
            }

            public function user($guard = null)
            {
                return $this->user;
            }
        };

        $service = Mockery::mock(GoogleDriveService::class);
        $service->shouldReceive('moveToTrash')
            ->once()
            ->andThrow(new RuntimeException('Google Drive authorization needs to be updated.', 403));

        $response = (new GDriveController())->trash($request, $account, 'file-1', $service);

        $this->assertSame(403, $response->getStatusCode());

        $payload = json_decode($response->getContent(), true, 512, JSON_THROW_ON_ERROR);

        $this->assertSame('gdrive_insufficient_scope', $payload['error_code']);
        $this->assertTrue($payload['reconnect_required']);
        $this->assertSame('Google Drive authorization needs to be updated.', $payload['message']);
    }

    private function revokedAccount(User $user, ?string $googleAccountId, string $email = 'old@example.com'): GDriveAccount
    {
        return GDriveAccount::query()->create([
            'user_id' => $user->id,
            'email' => $email,
            'google_account_id' => $googleAccountId,
            'revoked_at' => now(),
        ]);
    }

    private function startReconnect(User $user, GDriveAccount $account): string
    {
        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/gdrive/accounts/'.$account->id.'/reconnect')
            ->assertOk();

        return $this->oauthStateFromUrl($response->json('url'));
    }

    private function oauthStateFromUrl(string $url): string
    {
        parse_str((string) parse_url($url, PHP_URL_QUERY), $query);
        $this->assertIsString($query['state'] ?? null);

        return $query['state'];
    }

    private function fakeGoogleOAuth(string $permissionId, string $email = 'old@example.com'): void
    {
        Http::fake([
            'https://oauth2.googleapis.com/token' => Http::response([
                'access_token' => 'new-access-token',
                'refresh_token' => 'new-refresh-token',
                'expires_in' => 3600,
            ]),
            'https://www.googleapis.com/drive/v3/about*' => Http::response([
                'user' => [
                    'emailAddress' => $email,
                    'displayName' => 'Test Drive User',
                    'permissionId' => $permissionId,
                ],
            ]),
        ]);
    }

    private function completeCallback(string $state, array $extraQuery = []): TestResponse
    {
        return $this->get('/api/gdrive/callback?'.http_build_query([
            'code' => 'authorization-code',
            'state' => $state,
            ...$extraQuery,
        ]));
    }
}

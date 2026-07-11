<?php

namespace Tests\Feature;

use App\Http\Controllers\GDriveController;
use App\Models\GDriveAccount;
use App\Services\GoogleDriveService;
use Illuminate\Http\Request;
use Mockery;
use RuntimeException;
use Tests\TestCase;

class GDriveReconnectTest extends TestCase
{
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
}

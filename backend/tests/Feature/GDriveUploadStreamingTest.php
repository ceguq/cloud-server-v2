<?php

namespace Tests\Feature;

use App\Models\GDriveAccount;
use App\Services\GoogleDriveService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Mockery;
use Tests\TestCase;

class GDriveUploadStreamingTest extends TestCase
{
    public function test_upload_file_posts_streamed_multipart_body_to_google_drive(): void
    {
        $account = new class extends GDriveAccount {
            public string $id = 'account-1';
            public string $user_id = 'user-1';
            public ?string $access_token = 'token';
            public ?string $token_expires_at = null;
        };

        $tmpPath = tempnam(sys_get_temp_dir(), 'gdrive-upload');
        file_put_contents($tmpPath, 'stream-body-content');

        $uploadedFile = new UploadedFile(
            $tmpPath,
            'sample.bin',
            'application/octet-stream',
            null,
            true,
        );

        $service = Mockery::mock(GoogleDriveService::class)->makePartial();
        $service->shouldReceive('ensureFreshAccessToken')
            ->once()
            ->with($account)
            ->andReturn($account);

        Http::fake(function ($request) {
            $body = (string) $request->toPsrRequest()->getBody();
            $contentType = $request->header('Content-Type');

            $this->assertStringContainsString('stream-body-content', $body);
            $this->assertStringContainsString('multipart/related', is_array($contentType) ? implode($contentType) : $contentType);

            return Http::response(['id' => 'file-123'], 200);
        });

        $response = $service->uploadFile($account, $uploadedFile);

        $this->assertSame(['id' => 'file-123'], $response);

        @unlink($tmpPath);
    }
}

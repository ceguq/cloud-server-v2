<?php

namespace App\Services;

use App\Models\GDriveAccount;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Throwable;


class GoogleDriveService

{
    private const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
    private const DRIVE_FILE_MEDIA_ENDPOINT = 'https://www.googleapis.com/drive/v3/files';

    private function fileDownloadUrl(string $fileId): string
    {
        // Use alt=media for binary content.
        return self::DRIVE_FILE_MEDIA_ENDPOINT . '/' . $fileId . '?alt=media';
    }
    private const REVOKE_ENDPOINT = 'https://oauth2.googleapis.com/revoke';
    private const DRIVE_ABOUT_ENDPOINT = 'https://www.googleapis.com/drive/v3/about';
    private const DRIVE_FILES_ENDPOINT = 'https://www.googleapis.com/drive/v3/files';

    private const DRIVE_FILE_UPDATE_FIELDS = 'id,name,trashed,mimeType,modifiedTime';



    private function config(): array
    {
        $clientId = config('services.google_drive.client_id');
        $clientSecret = config('services.google_drive.client_secret');
        $redirectUri = config('services.google_drive.redirect_uri');
        $scopes = config('services.google_drive.scopes', []);

        if (empty($clientId) || empty($clientSecret) || empty($redirectUri)) {
            throw new RuntimeException('Google Drive OAuth config missing (client_id/client_secret/redirect_uri).');
        }

        return [
            'client_id' => $clientId,
            'client_secret' => $clientSecret,
            'redirect_uri' => $redirectUri,
            'scopes' => $scopes,
        ];
    }

    public function listFiles(GDriveAccount $account, ?string $pageToken = null, int $pageSize = 50): array
    {
        $account = $this->ensureFreshAccessToken($account);

        $query = [
            'pageSize' => min(max($pageSize, 1), 100),
            'fields' => 'nextPageToken,files(id,name,mimeType,iconLink,webViewLink,webContentLink,size,createdTime,modifiedTime,trashed,owners(displayName,emailAddress,photoLink),shared,starred)',
            'orderBy' => 'modifiedTime desc',
            'q' => 'trashed = false',
        ];

        if (! empty($pageToken)) {
            $query['pageToken'] = $pageToken;
        }

        $response = Http::withToken($account->access_token)
            ->get(self::DRIVE_FILES_ENDPOINT, $query)
            ->throw()
            ->json();

        $account->last_synced_at = now();
        $account->save();

        return is_array($response) ? $response : [];
    }

    public function listTrashedFiles(GDriveAccount $account, ?string $pageToken = null, int $pageSize = 50): array
    {
        $account = $this->ensureFreshAccessToken($account);

        $query = [
            'pageSize' => min(max($pageSize, 1), 100),
            'fields' => 'nextPageToken,files(id,name,mimeType,iconLink,webViewLink,webContentLink,size,createdTime,modifiedTime,trashed,owners(displayName,emailAddress,photoLink),shared,starred)',
            'orderBy' => 'modifiedTime desc',
            'q' => 'trashed = true',
        ];

        if (! empty($pageToken)) {
            $query['pageToken'] = $pageToken;
        }

        $response = Http::withToken($account->access_token)
            ->get(self::DRIVE_FILES_ENDPOINT, $query)
            ->throw()
            ->json();

        $account->last_synced_at = now();
        $account->save();

        return is_array($response) ? $response : [];
    }


    public function exchangeAuthorizationCode(string $code): array
    {
        $config = $this->config();

        $response = Http::asForm()->post(self::TOKEN_ENDPOINT, [
            'code' => $code,
            'client_id' => $config['client_id'],
            'client_secret' => $config['client_secret'],
            'redirect_uri' => $config['redirect_uri'],
            'grant_type' => 'authorization_code',
        ])->throw()->json();

        return is_array($response) ? $response : [];
    }

    public function refreshAccessToken(GDriveAccount $account): GDriveAccount
    {
        if (empty($account->refresh_token)) {
            throw new RuntimeException('Google Drive refresh_token is missing.');
        }

        $config = $this->config();

        $response = Http::asForm()->post(self::TOKEN_ENDPOINT, [
            'client_id' => $config['client_id'],
            'client_secret' => $config['client_secret'],
            'refresh_token' => $account->refresh_token,
            'grant_type' => 'refresh_token',
        ])->throw()->json();

        $accessToken = $response['access_token'] ?? null;
        if (empty($accessToken)) {
            throw new RuntimeException('Google Drive refresh token did not return access_token.');
        }

        $account->access_token = $accessToken;
        $account->token_expires_at = now()->addSeconds((int) ($response['expires_in'] ?? 3600));

        $scope = $response['scope'] ?? null;
        if (!empty($scope) && is_string($scope)) {
            $account->scopes = explode(' ', $scope);
        }

        $account->save();

        return $account->fresh() ?? $account;
    }

    public function shouldRefresh(GDriveAccount $account): bool
    {
        $expiresAt = $account->token_expires_at;
        if (empty($account->access_token) || empty($expiresAt)) {
            return true;
        }

        $expiresAt = $expiresAt instanceof Carbon ? $expiresAt : Carbon::parse($expiresAt);

        return $expiresAt->lessThanOrEqualTo(now()->addMinutes(5));
    }

    public function ensureFreshAccessToken(GDriveAccount $account): GDriveAccount
    {
        if (!$this->shouldRefresh($account)) {
            return $account;
        }

        return $this->refreshAccessToken($account);
    }

    public function getAccountAbout(string $accessToken): array
    {
        if (empty($accessToken)) {
            throw new RuntimeException('Google Drive access_token is missing.');
        }

        $response = Http::withToken($accessToken)
            ->get(self::DRIVE_ABOUT_ENDPOINT, [
                'fields' => 'user,storageQuota',
            ])
            ->throw()
            ->json();

        return is_array($response) ? $response : [];
    }

    public function revokeToken(?string $token): bool
    {
        if (empty($token)) {
            return false;
        }

        try {
            $response = Http::withHeaders([
                'Content-Type' => 'application/x-www-form-urlencoded',
            ])->asForm()->post(self::REVOKE_ENDPOINT, [
                'token' => $token,
            ]);

            return $response->successful();
        } catch (Throwable $e) {
            return false;
        }
    }

    private function workspaceExportTarget(string $mimeType): ?array
    {
        return match ($mimeType) {
            'application/vnd.google-apps.document' => [
                'export_mimeType' => 'application/pdf',
                'extension' => 'pdf',
            ],
            'application/vnd.google-apps.spreadsheet' => [
                'export_mimeType' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'extension' => 'xlsx',
            ],
            'application/vnd.google-apps.presentation' => [
                'export_mimeType' => 'application/pdf',
                'extension' => 'pdf',
            ],
            'application/vnd.google-apps.drawing' => [
                'export_mimeType' => 'image/png',
                'extension' => 'png',
            ],
            default => null,
        };
    }

    private function filenameWithExtension(string $fileName, string $extension): string
    {
        $clean = trim($fileName);
        if ($clean === '') {
            $clean = 'gdrive-file';
        }

        // Basic sanitization for header; keep non-ASCII safe.
        $clean = str_replace(['"', "'", "\\"], '', $clean);

        return $clean . '.' . ltrim(strtolower($extension), '.');
    }

    public function moveToTrash(GDriveAccount $account, string $fileId): array
    {
        return $this->updateTrashState($account, $fileId, true);
    }

    public function restoreFromTrash(GDriveAccount $account, string $fileId): array
    {
        return $this->updateTrashState($account, $fileId, false);
    }

    public function deletePermanently(GDriveAccount $account, string $fileId): array
    {
        $account = $this->ensureFreshAccessToken($account);

        $encodedFileId = rawurlencode($fileId);
        $url = self::DRIVE_FILES_ENDPOINT . '/' . $encodedFileId;

        $response = Http::withToken($account->access_token)
            ->delete($url);

        if ($response->successful()) {
            return [
                'id' => $fileId,
                'deleted' => true,
            ];
        }

        $status = (int) $response->status();
        if ($status === 401 || $status === 403) {
            throw new RuntimeException('Google Drive delete permission denied.', $status);
        }

        throw new RuntimeException('Google Drive permanent delete failed.', $status ?: 500);
    }

    private function updateTrashState(GDriveAccount $account, string $fileId, bool $trashed): array

    {
        $account = $this->ensureFreshAccessToken($account);

        $response = Http::withToken($account->access_token)
            ->patch(self::DRIVE_FILES_ENDPOINT . '/' . $fileId, [
                'trashed' => $trashed,
            ], [
                'fields' => self::DRIVE_FILE_UPDATE_FIELDS,
            ])
            ->throw()
            ->json();

        if (! is_array($response)) {
            return [
                'id' => $fileId,
                'trashed' => $trashed,
            ];
        }

        return [
            'id' => $response['id'] ?? $fileId,
            'name' => $response['name'] ?? null,
            'trashed' => $response['trashed'] ?? $trashed,
            'mimeType' => $response['mimeType'] ?? null,
            'modifiedTime' => $response['modifiedTime'] ?? null,
        ];
    }

    public function downloadFile(GDriveAccount $account, string $fileId)
    {
        $account = $this->ensureFreshAccessToken($account);

        // Fetch basic metadata for filename.
        $meta = Http::withToken($account->access_token)
            ->get(self::DRIVE_FILES_ENDPOINT . '/' . $fileId, [
                'fields' => 'id,name,mimeType',
            ])
            ->throw()
            ->json();

        if (! is_array($meta)) {
            throw new RuntimeException('Failed to resolve Google Drive file metadata.');
        }

        $fileName = isset($meta['name']) && is_string($meta['name']) ? $meta['name'] : ('gdrive-file-' . $fileId);
        $mimeType = isset($meta['mimeType']) && is_string($meta['mimeType']) ? $meta['mimeType'] : 'application/octet-stream';

        $workspaceTarget = $this->workspaceExportTarget($mimeType);

        // Workspace files: use export endpoint instead of alt=media.
        if ($workspaceTarget !== null) {
            $exportMimeType = $workspaceTarget['export_mimeType'];
            $extension = $workspaceTarget['extension'];
            $downloadFileName = $this->filenameWithExtension($fileName, $extension);

            $url = self::DRIVE_FILES_ENDPOINT . '/' . $fileId . '/export';

            $response = Http::withToken($account->access_token)
                ->withOptions(['stream' => true])
                ->get($url, [
                    'mimeType' => $exportMimeType,
                ])
                ->throw();

            $disposition = 'attachment; filename="' . str_replace('"', '', $downloadFileName) . '"';

            return response()->stream(function () use ($response) {
                echo $response->body();
            }, 200, [
                'Content-Type' => $exportMimeType,
                'Content-Disposition' => $disposition,
            ]);
        }

        // Non-Workspace: ensure alt=media is sent as explicit query parameters.
        $encodedFileId = rawurlencode($fileId);
        $response = Http::withToken($account->access_token)
            ->withOptions(['stream' => true])
            ->get(self::DRIVE_FILE_MEDIA_ENDPOINT . '/' . $encodedFileId, [
                'alt' => 'media',
            ])
            ->throw();


        $disposition = 'attachment; filename="' . str_replace('"', '', $fileName) . '"';

        return response()->stream(function () use ($response) {
            echo $response->body();
        }, 200, [
            'Content-Type' => $mimeType,
            'Content-Disposition' => $disposition,
        ]);
    }

    public function uploadFile(GDriveAccount $account, \Illuminate\Http\UploadedFile $file): array
    {
        $account = $this->ensureFreshAccessToken($account);

        $mimeType = $file->getClientMimeType() ?: 'application/octet-stream';

        $metadata = [
            'name' => $file->getClientOriginalName(),
            'mimeType' => $mimeType,
        ];


        $fields = 'id,name,mimeType,size,createdTime,modifiedTime,webViewLink,webContentLink,iconLink,trashed,shared,starred,owners';


        // Endpoint: https://www.googleapis.com/upload/drive/v3/files
        // Query params must be sent as query:
        // uploadType=multipart
        // fields=...
        $url = 'https://www.googleapis.com/upload/drive/v3/files'
            . '?uploadType=multipart'
            . '&fields=' . urlencode($fields);


        // Multipart/related body: JSON metadata part + raw file bytes part.
        $metadataJson = json_encode($metadata);
        if (! is_string($metadataJson)) {
            throw new RuntimeException('Failed to encode Google Drive upload metadata.');
        }


        $boundary = 'nimbus_' . bin2hex(random_bytes(16));

        $eol = "\r\n";

        $fileBytes = file_get_contents($file->getRealPath());
        if (! is_string($fileBytes)) {
            throw new RuntimeException('Failed to read uploaded file bytes.');
        }

        $body = '';
        $body .= '--' . $boundary . $eol;
        $body .= 'Content-Type: application/json; charset=UTF-8' . $eol;
        $body .= $eol;
        $body .= $metadataJson . $eol;

        $body .= '--' . $boundary . $eol;
        $body .= 'Content-Type: ' . $metadata['mimeType'] . $eol;
        $body .= $eol;

        $body .= $fileBytes . $eol;

        $body .= '--' . $boundary . '--' . $eol;

        $response = null;
        $httpResponse = Http::withToken($account->access_token)
            ->withHeaders([
                'Content-Type' => 'multipart/related; boundary=' . $boundary,
                'Accept' => 'application/json',
            ])
            ->withBody($body, 'multipart/related; boundary=' . $boundary)
            ->post($url);

        $status = $httpResponse->status();

        if ($httpResponse->failed()) {
            $googleMessage = $httpResponse->json('error.message')
                ?? $httpResponse->json('error_description')
                ?? 'Google Drive upload request failed.';

            // Avoid leaking secrets/tokens.
            throw new RuntimeException('Google Drive upload failed: ' . $googleMessage, $status ?: 500);
        }

        $response = $httpResponse->json();

        if (! is_array($response)) {
            throw new RuntimeException('Google Drive upload failed.', 500);
        }

        return $response;
    }
}





<?php

namespace App\Services;

use App\Models\GDriveAccount;
use GuzzleHttp\Psr7\AppendStream;
use GuzzleHttp\Psr7\Utils;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Throwable;


class GoogleDriveService

{
    private const INSUFFICIENT_SCOPE_MESSAGE = 'Google Drive authorization needs to be updated.';
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

    public function listFiles(GDriveAccount $account, ?string $pageToken = null, int $pageSize = 50, ?string $folderId = null): array
    {
        $account = $this->ensureFreshAccessToken($account);
        $folderId = is_string($folderId) ? trim($folderId) : '';

        $query = [
            'pageSize' => min(max($pageSize, 1), 100),
            'fields' => 'nextPageToken,files(id,name,mimeType,iconLink,webViewLink,webContentLink,size,createdTime,modifiedTime,trashed,owners(displayName,emailAddress,photoLink),shared,starred)',
            'orderBy' => 'modifiedTime desc',
            'q' => $folderId !== ''
                ? "'" . str_replace(["\\", "'"], ["\\\\", "\\'"], $folderId) . "' in parents and trashed = false"
                : 'trashed = false',
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

    private function isInsufficientScopeResponse(Response $response): bool
    {
        $status = (int) $response->status();
        if ($status !== 401 && $status !== 403) {
            return false;
        }

        try {
            $payload = $response->json();
        } catch (Throwable) {
            $payload = null;
        }

        return $this->containsInsufficientScopeSignal($payload);
    }

    private function containsInsufficientScopeSignal(mixed $value): bool
    {
        if (is_string($value)) {
            $normalized = strtolower($value);

            return str_contains($normalized, 'insufficient_scope')
                || str_contains($normalized, 'insufficientpermissions')
                || str_contains($normalized, 'permission_denied')
                || str_contains($normalized, 'autherror')
                || str_contains($normalized, 'accessnotconfigured');
        }

        if (is_array($value)) {
            foreach ($value as $item) {
                if ($this->containsInsufficientScopeSignal($item)) {
                    return true;
                }
            }
        }

        return false;
    }

    private function throwInsufficientScopeException(): never
    {
        throw new RuntimeException(self::INSUFFICIENT_SCOPE_MESSAGE, 403);
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

        if ($this->isInsufficientScopeResponse($response)) {
            $this->throwInsufficientScopeException();
        }

        $status = (int) $response->status();
        if ($status === 401 || $status === 403) {
            throw new RuntimeException('Google Drive delete permission denied.', $status);
        }

        throw new RuntimeException('Google Drive permanent delete failed.', $status ?: 500);
    }

    public function updateFileVisibility(GDriveAccount $account, string $fileId, string $visibility): array
    {
        $account = $this->ensureFreshAccessToken($account);

        if ($visibility === 'public') {
            $anyonePermissions = $this->listAnyonePermissions($account, $fileId);

            if (count($anyonePermissions) === 0) {
                $encodedFileId = rawurlencode($fileId);

                $response = Http::withToken($account->access_token)
                    ->post(self::DRIVE_FILES_ENDPOINT . '/' . $encodedFileId . '/permissions?sendNotificationEmail=false&fields=id', [
                        'type' => 'anyone',
                        'role' => 'reader',
                        'allowFileDiscovery' => false,
                    ]);

                if ($response->failed()) {
                    if ($this->isInsufficientScopeResponse($response)) {
                        $this->throwInsufficientScopeException();
                    }

                    $response->throw();
                }
            }
        } elseif ($visibility === 'private') {
            foreach ($this->listAnyonePermissions($account, $fileId) as $permission) {
                $permissionId = $permission['id'] ?? null;
                if (! is_string($permissionId) || trim($permissionId) === '') {
                    continue;
                }

                $encodedFileId = rawurlencode($fileId);
                $encodedPermissionId = rawurlencode($permissionId);

                $response = Http::withToken($account->access_token)
                    ->delete(self::DRIVE_FILES_ENDPOINT . '/' . $encodedFileId . '/permissions/' . $encodedPermissionId);

                if ($response->failed()) {
                    if ($this->isInsufficientScopeResponse($response)) {
                        $this->throwInsufficientScopeException();
                    }

                    $response->throw();
                }
            }
        } else {
            throw new RuntimeException('Invalid Google Drive visibility.', 422);
        }

        return $this->getFileMetadata($account, $fileId);
    }

    private function listAnyonePermissions(GDriveAccount $account, string $fileId): array
    {
        $encodedFileId = rawurlencode($fileId);

        $response = Http::withToken($account->access_token)
            ->get(self::DRIVE_FILES_ENDPOINT . '/' . $encodedFileId . '/permissions', [
                'fields' => 'permissions(id,type,role,allowFileDiscovery)',
            ]);

        if ($response->failed()) {
            if ($this->isInsufficientScopeResponse($response)) {
                $this->throwInsufficientScopeException();
            }

            $response->throw();
        }

        $payload = $response->json();
        $permissions = is_array($payload) && isset($payload['permissions']) && is_array($payload['permissions'])
            ? $payload['permissions']
            : [];

        return array_values(array_filter($permissions, function ($permission) {
            return is_array($permission) && ($permission['type'] ?? null) === 'anyone';
        }));
    }

    private function getFileMetadata(GDriveAccount $account, string $fileId): array
    {
        $encodedFileId = rawurlencode($fileId);

        $response = Http::withToken($account->access_token)
            ->get(self::DRIVE_FILES_ENDPOINT . '/' . $encodedFileId, [
                'fields' => 'id,name,mimeType,iconLink,webViewLink,webContentLink,size,createdTime,modifiedTime,trashed,owners(displayName,emailAddress,photoLink),shared,starred',
            ]);

        if ($response->failed()) {
            if ($this->isInsufficientScopeResponse($response)) {
                $this->throwInsufficientScopeException();
            }

            $response->throw();
        }

        $payload = $response->json();

        return is_array($payload) ? $payload : [];
    }

    private function updateTrashState(GDriveAccount $account, string $fileId, bool $trashed): array

    {
        $account = $this->ensureFreshAccessToken($account);

        $response = Http::withToken($account->access_token)
            ->patch(self::DRIVE_FILES_ENDPOINT . '/' . $fileId, [
                'trashed' => $trashed,
            ], [
                'fields' => self::DRIVE_FILE_UPDATE_FIELDS,
            ]);

        if ($response->failed()) {
            if ($this->isInsufficientScopeResponse($response)) {
                $this->throwInsufficientScopeException();
            }

            $response->throw();
        }

        $payload = $response->json();

        if (! is_array($payload)) {
            return [
                'id' => $fileId,
                'trashed' => $trashed,
            ];
        }

        return [
            'id' => $payload['id'] ?? $fileId,
            'name' => $payload['name'] ?? null,
            'trashed' => $payload['trashed'] ?? $trashed,
            'mimeType' => $payload['mimeType'] ?? null,
            'modifiedTime' => $payload['modifiedTime'] ?? null,
        ];
    }

    public function renameFile(GDriveAccount $account, string $fileId, string $newName): array
    {
        $account = $this->ensureFreshAccessToken($account);

        $response = Http::withToken($account->access_token)
            ->patch(self::DRIVE_FILES_ENDPOINT . '/' . $fileId, [
                'name' => $newName,
            ], [
                'fields' => self::DRIVE_FILE_UPDATE_FIELDS,
            ]);

        if ($response->failed()) {
            if ($this->isInsufficientScopeResponse($response)) {
                $this->throwInsufficientScopeException();
            }

            $response->throw();
        }

        $payload = $response->json();

        if (! is_array($payload)) {
            return [
                'id' => $fileId,
                'name' => $newName,
            ];
        }

        return [
            'id' => $payload['id'] ?? $fileId,
            'name' => $payload['name'] ?? $newName,
            'trashed' => $payload['trashed'] ?? false,
            'mimeType' => $payload['mimeType'] ?? null,
            'modifiedTime' => $payload['modifiedTime'] ?? null,
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

        $fileHandle = fopen($file->getRealPath(), 'rb');
        if ($fileHandle === false) {
            throw new RuntimeException('Failed to open uploaded file stream.');
        }

        try {
            $body = new AppendStream();
            $body->addStream(Utils::streamFor('--' . $boundary . "\r\n"));
            $body->addStream(Utils::streamFor('Content-Type: application/json; charset=UTF-8' . "\r\n"));
            $body->addStream(Utils::streamFor("\r\n"));
            $body->addStream(Utils::streamFor($metadataJson . "\r\n"));
            $body->addStream(Utils::streamFor('--' . $boundary . "\r\n"));
            $body->addStream(Utils::streamFor('Content-Type: ' . $metadata['mimeType'] . "\r\n"));
            $body->addStream(Utils::streamFor("\r\n"));
            $body->addStream(Utils::streamFor($fileHandle));
            $body->addStream(Utils::streamFor("\r\n"));
            $body->addStream(Utils::streamFor('--' . $boundary . '--' . "\r\n"));

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
                if ($this->isInsufficientScopeResponse($httpResponse)) {
                    $this->throwInsufficientScopeException();
                }

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
        } finally {
            if (is_resource($fileHandle)) {
                fclose($fileHandle);
            }
        }
    }

    public function createFolder(GDriveAccount $account, string $name, ?string $parentId = null): array
    {
        $account = $this->ensureFreshAccessToken($account);

        $metadata = [
            'name' => $name,
            'mimeType' => 'application/vnd.google-apps.folder',
        ];

        if (is_string($parentId) && trim($parentId) !== '') {
            $metadata['parents'] = [$parentId];
        }

        $fields = 'id,name,mimeType,iconLink,webViewLink,webContentLink,size,createdTime,modifiedTime,trashed,owners(displayName,emailAddress,photoLink),shared,starred';
        $url = self::DRIVE_FILES_ENDPOINT . '?fields=' . urlencode($fields);

        $response = Http::withToken($account->access_token)
            ->post($url, $metadata);

        if ($response->failed()) {
            if ($this->isInsufficientScopeResponse($response)) {
                $this->throwInsufficientScopeException();
            }

            $response->throw();
        }

        $payload = $response->json();

        if (! is_array($payload)) {
            throw new RuntimeException('Google Drive create folder failed.', 500);
        }

        return $payload;
    }
}





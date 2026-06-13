<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Model as EloquentModel;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Log;

class ActivityLogService
{
    public function log(
        string $action,
        string $description,
        ?EloquentModel $subject = null,
        ?array $metadata = null,
        ?User $user = null,
        ?Request $request = null
    ): ?ActivityLog {
        $metadata = $metadata ?? [];
        $request = $request; // explicit local

        try {
            $resolvedUser = $user;

            if (!$resolvedUser) {
                if ($request) {
                    $resolvedUser = $request->user();
                }
            }

            $subjectType = null;
            $subjectId = null;
            if ($subject) {
                $subjectType = get_class($subject);
                $subjectId = (string) ($subject->getKey());
            }

            $ipAddress = $request ? $request->ip() : null;
            $userAgent = $request ? $request->userAgent() : null;

            $sanitizedMetadata = $this->sanitizeMetadata($metadata);

            return ActivityLog::create([
                'user_id' => $resolvedUser?->id,
                'action' => $action,
                'description' => $description,
                'subject_type' => $subjectType,
                'subject_id' => $subjectId,
                'metadata' => $sanitizedMetadata,
                'ip_address' => $ipAddress,
                'user_agent' => $userAgent,
            ]);
        } catch (\Throwable $e) {
            // Must not break the main operation.
            Log::warning('ActivityLog insert failed', [
                'action' => $action,
                'description' => $description,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * @param array $metadata
     * @return array
     */
    private function sanitizeMetadata(array $metadata): array
    {
        $sensitiveKeys = [
            'password',
            'password_confirmation',
            'token',
            'bearer_token',
            'authorization',
            'authorization_header',
            'cookie',
            'session',
            'session_identifier',
            'share_token',
            'stored_name',
            'path',
            'file',
            'file_contents',
            'contents',
            'temporary_path',
        ];

        $clean = [];
        foreach ($metadata as $key => $value) {
            if (in_array(strtolower((string) $key), $sensitiveKeys, true)) {
                continue;
            }
            $clean[$key] = $value;
        }

        // Remove nulls to keep metadata compact.
        return Arr::where($clean, fn($v) => $v !== null);
    }
}


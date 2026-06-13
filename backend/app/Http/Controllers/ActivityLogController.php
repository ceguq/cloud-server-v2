<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ActivityLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $action = $request->query('action');
        if (!is_string($action)) {
            $action = null;
        }

        $perPage = $request->query('per_page', 20);
        if (!is_numeric($perPage)) {
            $perPage = 20;
        }
        $perPage = (int) $perPage;
        $perPage = max(1, min(100, $perPage));

        $page = $request->query('page', 1);
        if (!is_numeric($page)) {
            $page = 1;
        }
        $page = (int) $page;
        $page = max(1, $page);

        $query = ActivityLog::query()
            ->where('user_id', $user->id)
            ->orderBy('created_at', 'desc');

        if ($action) {
            // exact match only
            $query->where('action', $action);
        }

        $paginator = $query->paginate($perPage, ['*'], 'page', $page);

        $data = $paginator->getCollection()->map(function (ActivityLog $log) {
            $logUser = $log->relationLoaded('user') ? $log->user : null;

            return [
                'id' => (string) $log->id,
                'action' => $log->action,
                'description' => $log->description,
                'subject_type' => $log->subject_type,
                'subject_id' => $log->subject_id,
                'metadata' => $log->metadata,
                'ip_address' => $log->ip_address,
                'user_agent' => $log->user_agent,
                'created_at' => $log->created_at?->toISOString(),
                'user' => $logUser ? [
                    'id' => $logUser->id,
                    'name' => $logUser->name,
                    'email' => $logUser->email,
                ] : null,
            ];
        });

        // Eager load user for minimal fields when needed.
        // Since all logs belong to the same user_id, it’s safe to load once.
        $userSafe = [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
        ];

        $data = $data->map(function ($item) use ($userSafe) {
            $item['user'] = $userSafe;
            return $item;
        });

        return response()->json([
            'data' => $data,
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }
}


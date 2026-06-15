<?php

namespace App\Http\Controllers;

use App\Models\Device;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DeviceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $devices = Device::query()
            ->where('user_id', $user->id)
            ->orderByDesc('last_seen_at')
            ->orderByDesc('created_at')
            ->get(['id', 'display_name', 'device_type', 'platform', 'browser', 'ip_address', 'trusted', 'last_seen_at', 'created_at', 'updated_at']);

        // Response tahap 1: jangan expose device_hash / user_agent / user_id
        $data = $devices->map(function (Device $device) {
            return [
                'id' => $device->id,
                'display_name' => $device->display_name,
                'device_type' => $device->device_type,
                'platform' => $device->platform,
                'browser' => $device->browser,
                'ip_address' => $device->ip_address,
                'trusted' => (bool) $device->trusted,
                'last_seen_at' => $device->last_seen_at?->toISOString(),
                'created_at' => $device->created_at?->toISOString(),
                'updated_at' => $device->updated_at?->toISOString(),
            ];
        });

        return response()->json([
            'data' => $data,
        ]);
    }
}


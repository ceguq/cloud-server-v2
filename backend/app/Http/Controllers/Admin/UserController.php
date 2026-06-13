<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $users = User::query()
            ->orderByDesc('created_at')
            ->get(['id', 'name', 'email', 'role', 'created_at', 'updated_at']);

        return response()->json([
            'data' => $users,
        ]);
    }
}


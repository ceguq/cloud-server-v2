<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AccountDeleteCleanupManifest extends Model
{
    protected $table = 'account_delete_cleanup_manifests';

    protected $fillable = [
        'operation_id',
        'subject_user_id',
        'status',
        'ownership_snapshot',
        'category_states',
        'attempt_count',
        'last_attempt_at',
        'completed_at',
        'failure_category',
    ];

    protected function casts(): array
    {
        return [
            'subject_user_id' => 'integer',
            'ownership_snapshot' => 'array',
            'category_states' => 'array',
            'attempt_count' => 'integer',
            'last_attempt_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }
}

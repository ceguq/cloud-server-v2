<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class GDriveAccount extends Model
{
    use HasFactory;
    use HasUuids;

    protected $table = 'gdrive_accounts';


    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'user_id',
        'label',
        'email',
        'google_account_id',
        'avatar_url',
        'access_token',
        'refresh_token',
        'token_expires_at',
        'scopes',
        'connected_at',
        'last_synced_at',
        'revoked_at',
    ];

    protected $casts = [
        'access_token' => 'encrypted',
        'refresh_token' => 'encrypted',
        'scopes' => 'array',
        'token_expires_at' => 'datetime',
        'connected_at' => 'datetime',
        'last_synced_at' => 'datetime',
        'revoked_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isRevoked(): bool
    {
        return $this->revoked_at !== null;
    }
}


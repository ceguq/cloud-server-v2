<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\SoftDeletes;

use App\Models\User;

class Folder extends Model
{
    use HasFactory;
    use HasUuids, SoftDeletes;


    protected $fillable = [
        'name',
        'parent_id',
        'user_id',
    ];

    public function children(): HasMany
    {
        return $this->hasMany(Folder::class, 'parent_id');
    }

    // For recursive restore/force delete helpers
    public function childrenWithTrashed(): HasMany
    {
        return $this->hasMany(Folder::class, 'parent_id')->withTrashed();
    }


    public function parent(): BelongsTo
    {
        return $this->belongsTo(Folder::class, 'parent_id');
    }

    public function files(): HasMany
    {
        return $this->hasMany(\App\Models\File::class, 'folder_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

}


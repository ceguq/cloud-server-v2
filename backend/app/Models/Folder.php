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

    public function collectDescendantFolderIds(bool $includeTrashed = false): array
    {
        $folderIds = [];
        $childrenQuery = $includeTrashed ? $this->childrenWithTrashed() : $this->children();

        foreach ($childrenQuery->get() as $child) {
            $folderIds[] = (string) $child->getKey();
            $folderIds = array_merge($folderIds, $child->collectDescendantFolderIds($includeTrashed));
        }

        return $folderIds;
    }

    public function hasOwnershipConflictForUser(string|int $userId, bool $includeTrashed = false): bool
    {
        $folderIds = $this->collectDescendantFolderIds($includeTrashed);
        $folderIds[] = (string) $this->getKey();

        $folders = Folder::query()
            ->when($includeTrashed, fn ($query) => $query->withTrashed())
            ->whereIn('id', $folderIds)
            ->get();

        foreach ($folders as $folder) {
            if ($folder->user_id === null || (string) $folder->user_id !== (string) $userId) {
                return true;
            }
        }

        $files = File::query()
            ->when($includeTrashed, fn ($query) => $query->withTrashed())
            ->whereIn('folder_id', $folderIds)
            ->get();

        foreach ($files as $file) {
            if ($file->user_id === null || (string) $file->user_id !== (string) $userId) {
                return true;
            }
        }

        return false;
    }

}


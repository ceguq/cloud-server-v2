<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $columnType = Schema::getColumnType('devices', 'user_id');
        if (in_array($columnType, ['bigint', 'integer'], true)) {
            return;
        }

        foreach (DB::table('devices')->select(['id', 'user_id'])->cursor() as $device) {
            $userId = (string) $device->user_id;
            if (! ctype_digit($userId)
                || (int) $userId <= 0
                || ! DB::table('users')->where('id', (int) $userId)->exists()) {
                throw new RuntimeException(
                    "Cannot safely convert devices.user_id for device {$device->id}.",
                );
            }
        }

        Schema::table('devices', function (Blueprint $table): void {
            $table->dropForeign(['user_id']);
            $table->unsignedBigInteger('user_id')->change();
        });

        Schema::table('devices', function (Blueprint $table): void {
            $table->foreign('user_id')
                ->references('id')
                ->on('users')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        // Reverting would restore a UUID foreign key to the integer users.id column.
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('folders', function (Blueprint $table) {
            $table->unsignedBigInteger('user_id')->nullable()->after('parent_id');
        });

        Schema::table('folders', function (Blueprint $table) {
            $table->index('user_id');
            $table->foreign('user_id')
                ->references('id')
                ->on('users')
                ->nullOnDelete();
        });

        if (Schema::hasTable('users')) {
            $userCount = DB::table('users')->count();

            if ($userCount === 1) {
                $singleUserId = DB::table('users')->value('id');

                if ($singleUserId !== null) {
                    DB::table('folders')
                        ->whereNull('user_id')
                        ->update(['user_id' => $singleUserId]);
                }
            } elseif ($userCount > 1) {
                $inferredFolders = DB::table('files')
                    ->select('folder_id')
                    ->selectRaw('MIN(user_id) as inferred_user_id')
                    ->whereNotNull('folder_id')
                    ->groupBy('folder_id')
                    ->havingRaw('COUNT(DISTINCT user_id) = 1')
                    ->get();

                foreach ($inferredFolders as $folder) {
                    DB::table('folders')
                        ->where('id', $folder->folder_id)
                        ->whereNull('user_id')
                        ->update(['user_id' => $folder->inferred_user_id]);
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('folders', 'user_id')) {
            try {
                Schema::table('folders', function (Blueprint $table) {
                    $table->dropForeign(['user_id']);
                });
            } catch (\Throwable $e) {
                // Ignore if the foreign key is already absent or unsupported by the driver.
            }

            try {
                Schema::table('folders', function (Blueprint $table) {
                    $table->dropIndex(['user_id']);
                });
            } catch (\Throwable $e) {
                // Ignore if the index is already absent or unsupported by the driver.
            }

            Schema::table('folders', function (Blueprint $table) {
                $table->dropColumn('user_id');
            });
        }
    }
};

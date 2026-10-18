<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('account_delete_cleanup_manifests', function (Blueprint $table) {
            $table->id();

            $table->string('operation_id', 64)->unique();

            $table->unsignedBigInteger('subject_user_id')->index();

            $table->string('status')->default('pending')->index();

            $table->json('ownership_snapshot');

            $table->json('category_states');

            $table->unsignedInteger('attempt_count')->default(0);

            $table->timestamp('last_attempt_at')->nullable();

            $table->timestamp('completed_at')->nullable();

            $table->string('failure_category')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('account_delete_cleanup_manifests');
    }
};

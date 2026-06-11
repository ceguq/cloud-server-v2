<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('share_links', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->uuid('file_id');
            $table->string('token')->unique();
            $table->timestamp('expires_at')->nullable();
            $table->string('password')->nullable();
            $table->unsignedInteger('download_count')->default(0);

            $table->timestamps();

            $table->foreign('file_id')
                ->references('id')
                ->on('files')
                ->cascadeOnDelete();

            $table->index('file_id');
            $table->index('token');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('share_links');
    }
};


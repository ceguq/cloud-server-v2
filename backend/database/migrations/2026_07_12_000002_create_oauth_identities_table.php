<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('oauth_identities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')
                ->constrained('users')
                ->cascadeOnDelete();
            $table->string('provider', 32);
            $table->string('provider_user_id');
            $table->string('provider_email')->nullable();
            $table->text('avatar_url')->nullable();
            $table->timestamps();

            $table->unique(['provider', 'provider_user_id'], 'oauth_identities_provider_provider_user_id_unique');
            $table->unique(['user_id', 'provider'], 'oauth_identities_user_id_provider_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('oauth_identities');
    }
};

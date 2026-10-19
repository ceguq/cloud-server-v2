<?php

namespace App\Providers;

use App\Services\FilesystemStatsProvider;
use App\Services\NativeFilesystemStatsProvider;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(FilesystemStatsProvider::class, NativeFilesystemStatsProvider::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}

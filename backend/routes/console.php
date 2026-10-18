<?php

use App\Services\AccountDeleteCleanupRemediationResult;
use App\Services\AccountDeleteCleanupRemediationService;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command(
    'account-delete:resume {operationId}',
    function (AccountDeleteCleanupRemediationService $service): int {
        $result = $service->resume((string) $this->argument('operationId'));

        if ($result->outcome === AccountDeleteCleanupRemediationResult::OUTCOME_COMPLETED) {
            $this->info('Account cleanup completed.');

            return 0;
        }

        if ($result->outcome === AccountDeleteCleanupRemediationResult::OUTCOME_CLEANUP_PENDING) {
            $this->warn('Account cleanup remains pending.');

            return 1;
        }

        $this->error('Account cleanup could not be resumed safely.');

        return 1;
    },
)->purpose('Resume an incomplete account cleanup using its internal operation ID.');

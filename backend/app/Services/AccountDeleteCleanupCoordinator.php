<?php

namespace App\Services;

use App\Models\AccountDeleteCleanupManifest;

final class AccountDeleteCleanupCoordinator
{
    public function __construct(
        private readonly AccountDeleteShareLinksCleanupOrchestrator $shareLinksOrchestrator,
        private readonly AccountDeleteOAuthIdentitiesCleanupOrchestrator $oauthIdentitiesOrchestrator,
        private readonly AccountDeletePhysicalLocalFilesCleanupOrchestrator $physicalLocalFilesOrchestrator,
        private readonly AccountDeleteDatabaseRecordsCleanupOrchestrator $databaseRecordsOrchestrator,
        private readonly AccountDeleteDevicesCleanupOrchestrator $devicesOrchestrator,
        private readonly AccountDeleteSanctumTokensCleanupOrchestrator $sanctumTokensOrchestrator,
        private readonly AccountDeleteGoogleDriveCredentialsCleanupOrchestrator $googleDriveCredentialsOrchestrator,
        private readonly AccountDeleteActivityLogsCleanupOrchestrator $activityLogsOrchestrator,
        private readonly AccountDeleteOtherUserOwnedResourcesCleanupOrchestrator $otherUserOwnedResourcesOrchestrator,
        private readonly AccountDeleteUserRecordCleanupOrchestrator $userRecordOrchestrator,
    ) {}

    /**
     * @return list<AccountDeleteCleanupCategoryExecutionResult>
     */
    public function execute(
        AccountDeleteCleanupManifest $manifest,
    ): array {
        $stages = [
            'share_links' => fn (): AccountDeleteCleanupCategoryExecutionResult => $this->shareLinksOrchestrator->executeWithResult($manifest),
            'oauth_identities' => fn (): AccountDeleteCleanupCategoryExecutionResult => $this->oauthIdentitiesOrchestrator->executeWithResult($manifest),
            'physical_local_files' => fn (): AccountDeleteCleanupCategoryExecutionResult => $this->physicalLocalFilesOrchestrator->executeWithResult($manifest),
            'database_records' => fn (): AccountDeleteCleanupCategoryExecutionResult => $this->databaseRecordsOrchestrator->executeWithResult($manifest),
            'devices' => fn (): AccountDeleteCleanupCategoryExecutionResult => $this->devicesOrchestrator->executeWithResult($manifest),
            'sanctum_tokens' => fn (): AccountDeleteCleanupCategoryExecutionResult => $this->sanctumTokensOrchestrator->executeWithResult($manifest),
            'google_drive_credentials' => fn (): AccountDeleteCleanupCategoryExecutionResult => $this->googleDriveCredentialsOrchestrator->executeWithResult($manifest),
            'activity_logs' => fn (): AccountDeleteCleanupCategoryExecutionResult => $this->activityLogsOrchestrator->executeWithResult($manifest),
            'other_user_owned_resources' => fn (): AccountDeleteCleanupCategoryExecutionResult => $this->otherUserOwnedResourcesOrchestrator->executeWithResult($manifest),
            'user_record' => fn (): AccountDeleteCleanupCategoryExecutionResult => $this->userRecordOrchestrator->executeWithResult($manifest),
        ];

        $results = [];

        foreach ($stages as $category => $execute) {
            $authoritativeManifest = $manifest->fresh();
            if ($authoritativeManifest !== null
                && ($authoritativeManifest->category_states[$category] ?? null) === 'completed'
                && $category !== 'user_record') {
                $result = AccountDeleteCleanupCategoryExecutionResult::completedWithoutExecution($category);
            } else {
                $result = $execute();
            }

            $results[] = $result;

            if (! $result->categoryCompleted) {
                return $results;
            }
        }

        return $results;
    }
}

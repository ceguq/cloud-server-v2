<?php

namespace Tests\Feature;

use App\Services\AccountDeleteCleanupCategoryExecutionResult;
use Tests\TestCase;

class AccountDeleteCleanupCategoryExecutionResultTest extends TestCase
{
    public function test_category_execution_result_distinguishes_rejected_completed_and_bookkeeping_failed_outcomes(): void
    {
        $rejected = AccountDeleteCleanupCategoryExecutionResult::rejected(
            'share_links',
        );

        $this->assertSame(
            'rejected',
            AccountDeleteCleanupCategoryExecutionResult::OUTCOME_REJECTED,
        );
        $this->assertSame('share_links', $rejected->category);
        $this->assertSame(
            AccountDeleteCleanupCategoryExecutionResult::OUTCOME_REJECTED,
            $rejected->outcome,
        );
        $this->assertSame(false, $rejected->cleanupExecuted);
        $this->assertSame(false, $rejected->categoryCompleted);

        $completed = AccountDeleteCleanupCategoryExecutionResult::completed(
            'oauth_identities',
        );

        $this->assertSame(
            'completed',
            AccountDeleteCleanupCategoryExecutionResult::OUTCOME_COMPLETED,
        );
        $this->assertSame('oauth_identities', $completed->category);
        $this->assertSame(
            AccountDeleteCleanupCategoryExecutionResult::OUTCOME_COMPLETED,
            $completed->outcome,
        );
        $this->assertSame(true, $completed->cleanupExecuted);
        $this->assertSame(true, $completed->categoryCompleted);

        $bookkeepingFailed =
            AccountDeleteCleanupCategoryExecutionResult::bookkeepingFailed(
                'share_links',
            );

        $this->assertSame(
            'bookkeeping_failed',
            AccountDeleteCleanupCategoryExecutionResult::OUTCOME_BOOKKEEPING_FAILED,
        );
        $this->assertSame('share_links', $bookkeepingFailed->category);
        $this->assertSame(
            AccountDeleteCleanupCategoryExecutionResult::OUTCOME_BOOKKEEPING_FAILED,
            $bookkeepingFailed->outcome,
        );
        $this->assertSame(true, $bookkeepingFailed->cleanupExecuted);
        $this->assertSame(false, $bookkeepingFailed->categoryCompleted);

        $this->assertNotSame(
            $rejected->outcome,
            $completed->outcome,
        );

        $this->assertNotSame(
            $rejected->outcome,
            $bookkeepingFailed->outcome,
        );

        $this->assertNotSame(
            $completed->outcome,
            $bookkeepingFailed->outcome,
        );

        $this->assertSame(false, $rejected->cleanupExecuted);
        $this->assertSame(true, $bookkeepingFailed->cleanupExecuted);
    }
}

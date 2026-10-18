<?php

namespace Tests\Feature;

use App\Services\AccountDeleteSanctumTokensCleanupResult;
use Tests\TestCase;

class AccountDeleteSanctumTokensCleanupResultContractTest extends TestCase
{
    public function test_cleanup_result_distinguishes_rejected_zero_from_eligible_zero(): void
    {
        $rejected = AccountDeleteSanctumTokensCleanupResult::rejected();

        $eligibleZero = AccountDeleteSanctumTokensCleanupResult::executed(0);

        $eligibleMultiple = AccountDeleteSanctumTokensCleanupResult::executed(3);

        $this->assertInstanceOf(AccountDeleteSanctumTokensCleanupResult::class, $rejected);
        $this->assertInstanceOf(AccountDeleteSanctumTokensCleanupResult::class, $eligibleZero);
        $this->assertInstanceOf(AccountDeleteSanctumTokensCleanupResult::class, $eligibleMultiple);

        // Rejected result
        $this->assertFalse($rejected->executed);
        $this->assertSame(0, $rejected->deletedCount);

        // Eligible zero-token result
        $this->assertTrue($eligibleZero->executed);
        $this->assertSame(0, $eligibleZero->deletedCount);

        // Eligible multiple-token result
        $this->assertTrue($eligibleMultiple->executed);
        $this->assertSame(3, $eligibleMultiple->deletedCount);
    }
}

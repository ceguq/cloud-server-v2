<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Services\AccountDeleteUserRecordCleanupResult;
use PHPUnit\Framework\TestCase;

final class AccountDeleteUserRecordCleanupResultContractTest extends TestCase
{
    public function test_result_reports_rejection_and_execution(): void
    {
        $rejected = AccountDeleteUserRecordCleanupResult::rejected();
        $this->assertFalse($rejected->executed);
        $this->assertSame(0, $rejected->deletedCount);

        $executed = AccountDeleteUserRecordCleanupResult::executed(1);
        $this->assertTrue($executed->executed);
        $this->assertSame(1, $executed->deletedCount);

        $alreadyAbsent = AccountDeleteUserRecordCleanupResult::executed(0);
        $this->assertTrue($alreadyAbsent->executed);
        $this->assertSame(0, $alreadyAbsent->deletedCount);
    }
}

<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Services\AccountDeleteActivityLogsCleanupResult;
use ReflectionClass;
use Tests\TestCase;

final class AccountDeleteActivityLogsCleanupResultContractTest extends TestCase
{
    public function test_activity_logs_cleanup_result_contract_has_rejected_and_executed_states(): void
    {
        $rejected = AccountDeleteActivityLogsCleanupResult::rejected();
        $this->assertInstanceOf(AccountDeleteActivityLogsCleanupResult::class, $rejected);
        $this->assertFalse($rejected->executed);
        $this->assertSame(0, $rejected->deletedCount);

        $executedZero = AccountDeleteActivityLogsCleanupResult::executed(0);
        $this->assertInstanceOf(AccountDeleteActivityLogsCleanupResult::class, $executedZero);
        $this->assertTrue($executedZero->executed);
        $this->assertSame(0, $executedZero->deletedCount);

        $executed = AccountDeleteActivityLogsCleanupResult::executed(4);
        $this->assertInstanceOf(AccountDeleteActivityLogsCleanupResult::class, $executed);
        $this->assertTrue($executed->executed);
        $this->assertSame(4, $executed->deletedCount);

        $reflection = new ReflectionClass(AccountDeleteActivityLogsCleanupResult::class);
        $this->assertTrue($reflection->isFinal());

        $executedProperty = $reflection->getProperty('executed');
        $this->assertTrue($executedProperty->isPublic());
        $this->assertTrue($executedProperty->isReadOnly());
        $this->assertSame('bool', $executedProperty->getType()->getName());

        $deletedCountProperty = $reflection->getProperty('deletedCount');
        $this->assertTrue($deletedCountProperty->isPublic());
        $this->assertTrue($deletedCountProperty->isReadOnly());
        $this->assertSame('int', $deletedCountProperty->getType()->getName());
    }
}

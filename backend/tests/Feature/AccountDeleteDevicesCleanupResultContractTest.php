<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Services\AccountDeleteDevicesCleanupResult;
use ReflectionClass;
use Tests\TestCase;

final class AccountDeleteDevicesCleanupResultContractTest extends TestCase
{
    public function test_result_distinguishes_rejected_and_executed_cleanup(): void
    {
        $rejected = AccountDeleteDevicesCleanupResult::rejected();
        $this->assertFalse($rejected->executed);
        $this->assertSame(0, $rejected->deletedCount);

        $zeroDevices = AccountDeleteDevicesCleanupResult::executed(0);
        $this->assertTrue($zeroDevices->executed);
        $this->assertSame(0, $zeroDevices->deletedCount);

        $deletedDevices = AccountDeleteDevicesCleanupResult::executed(2);
        $this->assertTrue($deletedDevices->executed);
        $this->assertSame(2, $deletedDevices->deletedCount);

        $reflection = new ReflectionClass(AccountDeleteDevicesCleanupResult::class);
        $this->assertTrue($reflection->isFinal());
        $this->assertTrue($reflection->getProperty('executed')->isReadOnly());
        $this->assertSame('bool', $reflection->getProperty('executed')->getType()->getName());
        $this->assertTrue($reflection->getProperty('deletedCount')->isReadOnly());
        $this->assertSame('int', $reflection->getProperty('deletedCount')->getType()->getName());
    }
}

<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Services\AccountDeleteGoogleDriveCredentialsCleanupResult;
use ReflectionClass;
use Tests\TestCase;

final class AccountDeleteGoogleDriveCredentialsCleanupResultContractTest extends TestCase
{
    public function test_result_distinguishes_rejected_and_executed_cleanup(): void
    {
        $rejected = AccountDeleteGoogleDriveCredentialsCleanupResult::rejected();
        $this->assertFalse($rejected->executed);
        $this->assertSame(0, $rejected->deletedCount);

        $zeroAccounts = AccountDeleteGoogleDriveCredentialsCleanupResult::executed(0);
        $this->assertTrue($zeroAccounts->executed);
        $this->assertSame(0, $zeroAccounts->deletedCount);

        $deletedAccounts = AccountDeleteGoogleDriveCredentialsCleanupResult::executed(2);
        $this->assertTrue($deletedAccounts->executed);
        $this->assertSame(2, $deletedAccounts->deletedCount);

        $reflection = new ReflectionClass(AccountDeleteGoogleDriveCredentialsCleanupResult::class);
        $this->assertTrue($reflection->isFinal());
        $this->assertTrue($reflection->getProperty('executed')->isReadOnly());
        $this->assertSame('bool', $reflection->getProperty('executed')->getType()->getName());
        $this->assertTrue($reflection->getProperty('deletedCount')->isReadOnly());
        $this->assertSame('int', $reflection->getProperty('deletedCount')->getType()->getName());
    }
}

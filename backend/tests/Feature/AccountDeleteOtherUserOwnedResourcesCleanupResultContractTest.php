<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Services\AccountDeleteOtherUserOwnedResourcesCleanupResult;
use ReflectionClass;
use Tests\TestCase;

final class AccountDeleteOtherUserOwnedResourcesCleanupResultContractTest extends TestCase
{
    public function test_result_distinguishes_rejected_and_executed_cleanup(): void
    {
        $rejected = AccountDeleteOtherUserOwnedResourcesCleanupResult::rejected();
        $this->assertFalse($rejected->executed);
        $this->assertSame(0, $rejected->deletedCount);

        $zeroResources = AccountDeleteOtherUserOwnedResourcesCleanupResult::executed(0);
        $this->assertTrue($zeroResources->executed);
        $this->assertSame(0, $zeroResources->deletedCount);

        $deletedResources = AccountDeleteOtherUserOwnedResourcesCleanupResult::executed(3);
        $this->assertTrue($deletedResources->executed);
        $this->assertSame(3, $deletedResources->deletedCount);

        $reflection = new ReflectionClass(AccountDeleteOtherUserOwnedResourcesCleanupResult::class);
        $this->assertTrue($reflection->isFinal());
        $this->assertTrue($reflection->getProperty('executed')->isReadOnly());
        $this->assertSame('bool', $reflection->getProperty('executed')->getType()->getName());
        $this->assertTrue($reflection->getProperty('deletedCount')->isReadOnly());
        $this->assertSame('int', $reflection->getProperty('deletedCount')->getType()->getName());
    }
}

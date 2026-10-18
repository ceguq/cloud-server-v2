<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Services\AccountDeletePhysicalLocalFilesCleanupResult;
use ReflectionClass;
use Tests\TestCase;

final class AccountDeletePhysicalLocalFilesCleanupResultContractTest extends TestCase
{
    public function test_physical_local_files_cleanup_result_distinguishes_rejection_and_execution(): void
    {
        $rejected = AccountDeletePhysicalLocalFilesCleanupResult::rejected();

        $this->assertFalse($rejected->executed);
        $this->assertSame(0, $rejected->deletedCount);

        $partialFailure = AccountDeletePhysicalLocalFilesCleanupResult::rejected(2);

        $this->assertFalse($partialFailure->executed);
        $this->assertSame(2, $partialFailure->deletedCount);

        $zeroFiles = AccountDeletePhysicalLocalFilesCleanupResult::executed(0);

        $this->assertTrue($zeroFiles->executed);
        $this->assertSame(0, $zeroFiles->deletedCount);

        $deletedFiles = AccountDeletePhysicalLocalFilesCleanupResult::executed(3);

        $this->assertTrue($deletedFiles->executed);
        $this->assertSame(3, $deletedFiles->deletedCount);

        $reflection = new ReflectionClass(AccountDeletePhysicalLocalFilesCleanupResult::class);

        $this->assertTrue($reflection->isFinal());
        $this->assertTrue($reflection->getProperty('executed')->isReadOnly());
        $this->assertSame('bool', $reflection->getProperty('executed')->getType()->getName());
        $this->assertTrue($reflection->getProperty('deletedCount')->isReadOnly());
        $this->assertSame('int', $reflection->getProperty('deletedCount')->getType()->getName());
    }
}

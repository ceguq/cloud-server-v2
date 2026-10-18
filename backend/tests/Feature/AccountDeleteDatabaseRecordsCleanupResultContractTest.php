<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Services\AccountDeleteDatabaseRecordsCleanupResult;
use ReflectionClass;
use Tests\TestCase;

final class AccountDeleteDatabaseRecordsCleanupResultContractTest extends TestCase
{
    public function test_database_records_cleanup_result_contract_has_rejected_and_executed_states(): void
    {
        // ── Rejected state ───────────────────────────────────────────────────

        $rejected = AccountDeleteDatabaseRecordsCleanupResult::rejected();

        $this->assertInstanceOf(AccountDeleteDatabaseRecordsCleanupResult::class, $rejected);
        $this->assertFalse($rejected->executed);
        $this->assertSame(0, $rejected->deletedCount);

        // ── Executed zero-record state ───────────────────────────────────────

        $executedZero = AccountDeleteDatabaseRecordsCleanupResult::executed(0);

        $this->assertInstanceOf(AccountDeleteDatabaseRecordsCleanupResult::class, $executedZero);
        $this->assertTrue($executedZero->executed);
        $this->assertSame(0, $executedZero->deletedCount);

        // ── Executed non-zero state ──────────────────────────────────────────

        $executedFive = AccountDeleteDatabaseRecordsCleanupResult::executed(5);

        $this->assertInstanceOf(AccountDeleteDatabaseRecordsCleanupResult::class, $executedFive);
        $this->assertTrue($executedFive->executed);
        $this->assertSame(5, $executedFive->deletedCount);

        // ── Immutability assertions via reflection ───────────────────────────

        $reflection = new ReflectionClass(AccountDeleteDatabaseRecordsCleanupResult::class);

        $this->assertTrue($reflection->isFinal(), 'AccountDeleteDatabaseRecordsCleanupResult must be final.');

        $executedProperty = $reflection->getProperty('executed');
        $this->assertTrue($executedProperty->isPublic(), 'Property $executed must be public.');
        $this->assertTrue($executedProperty->isReadOnly(), 'Property $executed must be readonly.');
        $this->assertSame('bool', $executedProperty->getType()->getName(), 'Property $executed must be bool.');

        $deletedCountProperty = $reflection->getProperty('deletedCount');
        $this->assertTrue($deletedCountProperty->isPublic(), 'Property $deletedCount must be public.');
        $this->assertTrue($deletedCountProperty->isReadOnly(), 'Property $deletedCount must be readonly.');
        $this->assertSame('int', $deletedCountProperty->getType()->getName(), 'Property $deletedCount must be int.');
    }
}

<?php

namespace Tests\Feature;

use Tests\TestCase;

class GDriveScopeConfigTest extends TestCase
{
    public function test_example_environment_documents_the_broad_google_drive_scope(): void
    {
        $exampleEnvPath = base_path('.env.example');

        $this->assertFileExists($exampleEnvPath);

        $contents = file_get_contents($exampleEnvPath);

        $this->assertNotFalse($contents);
        $this->assertStringContainsString(
            'GOOGLE_DRIVE_SCOPES=https://www.googleapis.com/auth/drive',
            $contents,
        );
    }
}

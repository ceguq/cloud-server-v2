<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ServerMonitorController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        // The endpoint is intended to be read-only and should not depend on any user mutation.
        // If middleware auth:sanctum is applied, $request->user() is expected to exist.

        $warnings = [];

        $hostname = gethostname() ?: null;
        if (!is_string($hostname) || $hostname === '') {
            $hostname = null;
            $warnings[] = 'hostname unavailable';
        }

        $windowsOs = $this->isWindows() ? $this->getWindowsOperatingSystemInfo($warnings) : null;
        $windowsCpu = $this->isWindows() ? $this->getWindowsCpuInfo($warnings) : null;
        $osInfo = $this->getOperatingSystemInfo($warnings, $windowsOs);

        $phpVersion = defined('PHP_VERSION') ? (string) PHP_VERSION : null;
        $laravelVersion = is_string(app()->version()) ? app()->version() : null;

        $checkedAt = now()->toISOString();

        $uptimeSeconds = $this->getUptimeSeconds($warnings, $windowsOs);

        $cpu = $this->getCpuInfo($warnings, $windowsCpu);
        $memory = $this->getMemoryInfo($warnings, $windowsOs);
        $disk = $this->getDiskInfo($warnings);
        $network = $this->getNetworkInfo($hostname, $warnings);

        $services = [
            [
                'name' => 'Laravel API',
                'status' => 'online',
                'details' => 'API responded successfully',
            ],
            [
                'name' => 'Storage Disk',
                'status' => 'unknown',
                'details' => null,
            ],
        ];

        // Try to minimally confirm that a filesystem path is readable without exposing it.
        try {
            $base = base_path();
            $services[1]['status'] = is_string($base) && is_dir($base) ? 'online' : 'unknown';
            $services[1]['details'] = $services[1]['status'] === 'online'
                ? 'Storage path is readable'
                : 'Storage path is not readable';
        } catch (\Throwable $e) {
            $warnings[] = 'storage disk check unavailable';
            $services[1]['status'] = 'unknown';
            $services[1]['details'] = 'Storage path check failed';
        }

        return response()->json([
            'server' => [
                'hostname' => $hostname,
                'os' => $osInfo['label'],
                'os_family' => $osInfo['family'],
                'os_name' => $osInfo['name'],
                'os_version' => $osInfo['version'],
                'architecture' => $osInfo['architecture'],
                'php_version' => $phpVersion,
                'laravel_version' => $laravelVersion,
                'uptime_seconds' => $uptimeSeconds,
                'checked_at' => $checkedAt,
            ],
            'cpu' => [
                'load_1m' => $cpu['load_1m'],
                'load_5m' => $cpu['load_5m'],
                'load_15m' => $cpu['load_15m'],
                'usage_percent' => $cpu['usage_percent'],
                'model' => $cpu['model'],
                'logical_cores' => $cpu['logical_cores'],
                'physical_cores' => $cpu['physical_cores'],
            ],
            'memory' => [
                'total_bytes' => $memory['total_bytes'],
                'used_bytes' => $memory['used_bytes'],
                'free_bytes' => $memory['free_bytes'],
                'usage_percent' => $memory['usage_percent'],
            ],
            'disk' => [
                'total_bytes' => $disk['total_bytes'],
                'used_bytes' => $disk['used_bytes'],
                'free_bytes' => $disk['free_bytes'],
                'usage_percent' => $disk['usage_percent'],
            ],
            'network' => [
                'local_ips' => $network['local_ips'],
                'primary_ip' => $network['primary_ip'],
            ],
            'services' => $services,
            'warnings' => array_values(array_unique($warnings)),
        ]);
    }

    private function isWindows(): bool
    {
        return defined('PHP_OS_FAMILY') && PHP_OS_FAMILY === 'Windows';
    }

    private function getOperatingSystemInfo(array &$warnings, ?array $windowsOs = null): array
    {
        $family = defined('PHP_OS_FAMILY') ? (string) PHP_OS_FAMILY : null;
        $name = $this->stringOrNull($windowsOs['Caption'] ?? null);
        $version = $this->stringOrNull($windowsOs['Version'] ?? null);
        $architecture = $this->stringOrNull($windowsOs['OSArchitecture'] ?? null);

        try {
            $unameName = function_exists('php_uname') ? @php_uname('s') : null;
            $unameVersion = function_exists('php_uname') ? @php_uname('r') : null;
            $unameMachine = function_exists('php_uname') ? @php_uname('m') : null;

            $name = $name ?? $this->stringOrNull($unameName);
            $version = $version ?? $this->stringOrNull($unameVersion);
            $architecture = $architecture ?? $this->stringOrNull($unameMachine);
        } catch (\Throwable $e) {
            $warnings[] = 'os uname info unavailable';
        }

        $labelParts = array_values(array_filter([
            $family,
            $name !== $family ? $name : null,
            $version,
        ]));

        return [
            'family' => $family,
            'name' => $name,
            'version' => $version,
            'architecture' => $architecture,
            'label' => count($labelParts) > 0 ? implode(' ', $labelParts) : null,
        ];
    }

    private function getWindowsOperatingSystemInfo(array &$warnings): ?array
    {
        return $this->runPowerShellJson(
            '$ErrorActionPreference = "Stop"; Get-CimInstance Win32_OperatingSystem | Select-Object TotalVisibleMemorySize,FreePhysicalMemory,LastBootUpTime,Caption,Version,OSArchitecture | ConvertTo-Json -Compress',
            $warnings,
            'windows operating system info unavailable',
        );
    }

    private function getWindowsCpuInfo(array &$warnings): ?array
    {
        return $this->runPowerShellJson(
            '$ErrorActionPreference = "Stop"; Get-CimInstance Win32_Processor | Select-Object -First 1 Name,NumberOfCores,NumberOfLogicalProcessors,LoadPercentage | ConvertTo-Json -Compress',
            $warnings,
            'windows cpu info unavailable',
        );
    }

    private function runPowerShellJson(string $script, array &$warnings, string $warning): ?array
    {
        if (!function_exists('shell_exec')) {
            $warnings[] = 'shell_exec unavailable';
            $warnings[] = $warning;
            return null;
        }

        try {
            $command = 'powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command ' . escapeshellarg($script);
            $output = @shell_exec($command);
        } catch (\Throwable $e) {
            $warnings[] = $warning;
            return null;
        }

        if (!is_string($output) || trim($output) === '') {
            $warnings[] = $warning;
            return null;
        }

        $decoded = json_decode(trim($output), true);
        if (!is_array($decoded)) {
            $warnings[] = $warning;
            return null;
        }

        return $decoded;
    }

    private function getCpuInfo(array &$warnings, ?array $windowsCpu = null): array
    {
        $load1 = null;
        $load5 = null;
        $load15 = null;
        $usagePercent = null;
        $model = null;
        $logicalCores = null;
        $physicalCores = null;

        if ($windowsCpu !== null) {
            $usagePercent = $this->numericOrNull($windowsCpu['LoadPercentage'] ?? null);
            $model = $this->stringOrNull($windowsCpu['Name'] ?? null);
            $logicalCores = $this->intOrNull($windowsCpu['NumberOfLogicalProcessors'] ?? null);
            $physicalCores = $this->intOrNull($windowsCpu['NumberOfCores'] ?? null);
        }

        if (!$this->isWindows()) {
            if (function_exists('sys_getloadavg')) {
                try {
                    $avg = @sys_getloadavg();
                    if (is_array($avg) && count($avg) >= 3) {
                        $load1 = is_numeric($avg[0]) ? (float) $avg[0] : null;
                        $load5 = is_numeric($avg[1]) ? (float) $avg[1] : null;
                        $load15 = is_numeric($avg[2]) ? (float) $avg[2] : null;
                    }
                } catch (\Throwable $e) {
                    $warnings[] = 'sys_getloadavg failed';
                }
            } else {
                $warnings[] = 'sys_getloadavg unavailable';
            }
        }

        if (!$this->isWindows()) {
            $linuxCpu = $this->getLinuxCpuInfo($warnings);
            $usagePercent = $usagePercent ?? $this->getLinuxCpuUsagePercent($warnings);
            $model = $model ?? $linuxCpu['model'];
            $logicalCores = $logicalCores ?? $linuxCpu['logical_cores'];
            $physicalCores = $physicalCores ?? $linuxCpu['physical_cores'];
        }

        if ($load1 === null && $load5 === null && $load15 === null && $usagePercent === null) {
            $warnings[] = 'cpu load metrics unavailable';
        }

        return [
            'load_1m' => $load1,
            'load_5m' => $load5,
            'load_15m' => $load15,
            'usage_percent' => $usagePercent !== null ? (float) round($usagePercent, 2) : null,
            'model' => $model,
            'logical_cores' => $logicalCores,
            'physical_cores' => $physicalCores,
        ];
    }

    private function getLinuxCpuInfo(array &$warnings): array
    {
        $model = null;
        $logicalCores = null;
        $physicalCores = null;

        $cpuInfoPath = '/proc/cpuinfo';
        if (!is_readable($cpuInfoPath)) {
            return [
                'model' => null,
                'logical_cores' => null,
                'physical_cores' => null,
            ];
        }

        try {
            $contents = @file_get_contents($cpuInfoPath);
            if (!is_string($contents) || $contents === '') {
                throw new \RuntimeException('empty cpuinfo');
            }

            $match = [];
            if (@preg_match('/^model name\s*:\s*(.+)$/m', $contents, $match) === 1) {
                $model = $this->stringOrNull($match[1] ?? null);
            }

            $processors = [];
            if (@preg_match_all('/^processor\s*:/m', $contents, $processors) !== false) {
                $logicalCores = count($processors[0] ?? []);
                if ($logicalCores === 0) {
                    $logicalCores = null;
                }
            }

            if (@preg_match('/^cpu cores\s*:\s*(\d+)$/m', $contents, $match) === 1) {
                $physicalCores = $this->intOrNull($match[1] ?? null);
            }
        } catch (\Throwable $e) {
            $warnings[] = 'linux cpu info parsing failed';
        }

        return [
            'model' => $model,
            'logical_cores' => $logicalCores,
            'physical_cores' => $physicalCores,
        ];
    }

    private function getLinuxCpuUsagePercent(array &$warnings): ?float
    {
        $first = $this->readLinuxCpuStat();
        if ($first === null) {
            return null;
        }

        usleep(100000);

        $second = $this->readLinuxCpuStat();
        if ($second === null) {
            return null;
        }

        $totalDelta = $second['total'] - $first['total'];
        $idleDelta = $second['idle'] - $first['idle'];

        if ($totalDelta <= 0) {
            $warnings[] = 'linux cpu usage sample invalid';
            return null;
        }

        return max(0, min(100, (1 - ($idleDelta / $totalDelta)) * 100));
    }

    private function readLinuxCpuStat(): ?array
    {
        $statPath = '/proc/stat';
        if (!is_readable($statPath)) {
            return null;
        }

        $contents = @file_get_contents($statPath);
        if (!is_string($contents) || $contents === '') {
            return null;
        }

        $line = strtok($contents, "\n");
        if (!is_string($line) || !str_starts_with($line, 'cpu ')) {
            return null;
        }

        $parts = preg_split('/\s+/', trim($line));
        if (!$parts || count($parts) < 5) {
            return null;
        }

        array_shift($parts);
        $values = array_map(static fn ($value) => is_numeric($value) ? (float) $value : 0.0, $parts);
        $idle = ($values[3] ?? 0.0) + ($values[4] ?? 0.0);

        return [
            'idle' => $idle,
            'total' => array_sum($values),
        ];
    }

    private function getMemoryInfo(array &$warnings, ?array $windowsOs = null): array
    {
        if ($windowsOs !== null) {
            $totalKb = $this->numericOrNull($windowsOs['TotalVisibleMemorySize'] ?? null);
            $freeKb = $this->numericOrNull($windowsOs['FreePhysicalMemory'] ?? null);

            if ($totalKb !== null && $freeKb !== null) {
                $total = $totalKb * 1024;
                $free = $freeKb * 1024;
                $used = max(0, $total - $free);

                return [
                    'total_bytes' => (float) $total,
                    'used_bytes' => (float) $used,
                    'free_bytes' => (float) $free,
                    'usage_percent' => $total > 0 ? (float) round(($used / $total) * 100, 2) : null,
                ];
            }

            $warnings[] = 'windows memory metrics unavailable';
        }

        $total = null;
        $free = null;
        $available = null;

        $meminfoPath = '/proc/meminfo';
        if (!is_readable($meminfoPath)) {
            $warnings[] = 'memory info (/proc/meminfo) unavailable';
            return [
                'total_bytes' => null,
                'used_bytes' => null,
                'free_bytes' => null,
                'usage_percent' => null,
            ];
        }

        try {
            $contents = @file_get_contents($meminfoPath);
            if (!is_string($contents) || $contents === '') {
                throw new \RuntimeException('empty meminfo');
            }

            $totalKb = $this->parseProcMeminfoValue($contents, 'MemTotal');
            $availKb = $this->parseProcMeminfoValue($contents, 'MemAvailable');

            if ($totalKb !== null) {
                $total = (float) $totalKb * 1024;
            }
            if ($availKb !== null) {
                $available = (float) $availKb * 1024;
            }

            // Interpret free as MemAvailable (graceful for missing Swap/cached semantics)
            if ($available !== null) {
                $free = $available;
            }
        } catch (\Throwable $e) {
            $warnings[] = 'memory info parsing failed';
        }

        if ($total === null) {
            $warnings[] = 'memory total unavailable';
            return [
                'total_bytes' => null,
                'used_bytes' => null,
                'free_bytes' => null,
                'usage_percent' => null,
            ];
        }

        $used = $free !== null ? max(0, $total - $free) : null;
        $usagePercent = null;
        if ($free !== null && $total > 0 && $used !== null) {
            $usagePercent = ($used / $total) * 100;
        }

        return [
            'total_bytes' => $total !== null ? (float) $total : null,
            'used_bytes' => $used !== null ? (float) $used : null,
            'free_bytes' => $free !== null ? (float) $free : null,
            'usage_percent' => $usagePercent !== null ? (float) round($usagePercent, 2) : null,
        ];
    }

    private function parseProcMeminfoValue(string $contents, string $key): ?float
    {
        // Example line: MemTotal:       16333736 kB
        // Example line: MemAvailable:   8423820 kB
        $pattern = '/^' . preg_quote($key, '/') . '\s*:\s*(\\d+(?:\\.\\d+)?)\s*kB\s*$/m';

        $match = [];
        $ok = @preg_match($pattern, $contents, $match);
        if ($ok !== 1) {
            return null;
        }

        if (!isset($match[1]) || !is_numeric($match[1])) {
            return null;
        }

        return (float) $match[1];
    }

    private function getDiskInfo(array &$warnings): array
    {
        $total = null;
        $free = null;

        try {
            $total = @disk_total_space(base_path());
            $free = @disk_free_space(base_path());
        } catch (\Throwable $e) {
            $warnings[] = 'disk space query failed';
        }

        if (!is_numeric($total) || !is_numeric($free)) {
            $warnings[] = 'disk metrics unavailable';
            return [
                'total_bytes' => null,
                'used_bytes' => null,
                'free_bytes' => null,
                'usage_percent' => null,
            ];
        }

        $total = (float) $total;
        $free = (float) $free;
        $used = max(0, $total - $free);

        $usagePercent = null;
        if ($total > 0) {
            $usagePercent = (float) round(($used / $total) * 100, 2);
        }

        return [
            'total_bytes' => $total,
            'used_bytes' => $used,
            'free_bytes' => $free,
            'usage_percent' => $usagePercent,
        ];
    }

    private function getNetworkInfo(?string $hostname, array &$warnings): array
    {
        $ips = [];

        if ($hostname !== null && function_exists('gethostbynamel')) {
            try {
                $resolved = @gethostbynamel($hostname);
                if (is_array($resolved)) {
                    $ips = array_merge($ips, $resolved);
                }
            } catch (\Throwable $e) {
                $warnings[] = 'hostname ip resolution failed';
            }
        }

        $serverAddr = $_SERVER['SERVER_ADDR'] ?? null;
        if (is_string($serverAddr) && $serverAddr !== '') {
            $ips[] = $serverAddr;
        }

        if ($this->isWindows()) {
            $windowsIps = $this->getWindowsLocalIps($warnings);
            $ips = array_merge($ips, $windowsIps);
        }

        $ips = array_values(array_unique(array_filter(array_map(
            fn ($ip) => $this->isSafeLocalIp($ip) ? $ip : null,
            $ips,
        ))));

        return [
            'local_ips' => $ips,
            'primary_ip' => $ips[0] ?? null,
        ];
    }

    private function getWindowsLocalIps(array &$warnings): array
    {
        $data = $this->runPowerShellJson(
            '$ErrorActionPreference = "Stop"; [pscustomobject]@{ LocalIps = @(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -ne "127.0.0.1" -and $_.IPAddress -notlike "169.254.*" } | Select-Object -ExpandProperty IPAddress) } | ConvertTo-Json -Compress',
            $warnings,
            'windows network ip info unavailable',
        );

        if ($data === null) {
            return [];
        }

        $ips = $data['LocalIps'] ?? [];
        if (is_string($ips)) {
            return [$ips];
        }

        if (is_array($ips)) {
            return array_values(array_filter($ips, 'is_string'));
        }

        return [];
    }

    private function isSafeLocalIp(mixed $value): bool
    {
        if (!is_string($value) || $value === '') {
            return false;
        }

        if (!filter_var($value, FILTER_VALIDATE_IP)) {
            return false;
        }

        return !in_array($value, ['127.0.0.1', '::1', '0.0.0.0'], true)
            && !str_starts_with($value, '169.254.');
    }

    private function getUptimeSeconds(array &$warnings, ?array $windowsOs = null): ?float
    {
        if ($windowsOs !== null) {
            $lastBootRaw = $windowsOs['LastBootUpTime'] ?? null;
            $lastBootTimestamp = $this->parseWindowsDateTimestamp($lastBootRaw);

            if ($lastBootTimestamp !== null) {
                return max(0, time() - $lastBootTimestamp);
            }

            $warnings[] = 'windows uptime parse failed';
        }

        $procUptime = '/proc/uptime';
        if (!is_readable($procUptime)) {
            $warnings[] = 'uptime info (/proc/uptime) unavailable';
            return null;
        }

        try {
            $contents = @file_get_contents($procUptime);
            if (!is_string($contents) || $contents === '') {
                throw new \RuntimeException('empty /proc/uptime');
            }

            $parts = preg_split('/\s+/', trim($contents));
            if (!$parts || !isset($parts[0]) || !is_numeric($parts[0])) {
                $warnings[] = 'uptime parse failed';
                return null;
            }

            // /proc/uptime first value is seconds (float)
            return (float) $parts[0];
        } catch (\Throwable $e) {
            $warnings[] = 'uptime read failed';
            return null;
        }
    }

    private function parseWindowsDateTimestamp(mixed $value): ?float
    {
        if (!is_string($value) || trim($value) === '') {
            return null;
        }

        $value = trim($value);
        $match = [];
        if (@preg_match('/^\/Date\((-?\d+)\)\/$/', $value, $match) === 1) {
            return ((float) $match[1]) / 1000;
        }

        $timestamp = strtotime($value);
        return $timestamp !== false ? (float) $timestamp : null;
    }

    private function numericOrNull(mixed $value): ?float
    {
        return is_numeric($value) ? (float) $value : null;
    }

    private function intOrNull(mixed $value): ?int
    {
        return is_numeric($value) ? (int) $value : null;
    }

    private function stringOrNull(mixed $value): ?string
    {
        if (!is_string($value)) {
            return null;
        }

        $value = trim($value);
        return $value !== '' ? $value : null;
    }
}


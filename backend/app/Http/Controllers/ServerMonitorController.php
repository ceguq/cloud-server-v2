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

        $os = null;
        try {
            $os = defined('PHP_OS_FAMILY') ? (string) PHP_OS_FAMILY : null;
        } catch (\Throwable $e) {
            $os = null;
        }

        // php_uname('s') can fail on some environments; keep it defensive.
        try {
            $uname = function_exists('php_uname') ? @php_uname('s') : null;
            if (is_string($uname) && $uname !== '') {
                $os = $os ? ($os . ' ' . $uname) : $uname;
            }
        } catch (\Throwable $e) {
            // ignore
        }

        $phpVersion = defined('PHP_VERSION') ? (string) PHP_VERSION : null;
        $laravelVersion = is_string(app()->version()) ? app()->version() : null;

        $checkedAt = now()->toISOString();

        $uptimeSeconds = $this->getUptimeSeconds($warnings);

        $cpu = $this->getCpuLoad($warnings);
        $memory = $this->getMemoryInfo($warnings);
        $disk = $this->getDiskInfo($warnings);

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
                'os' => $os,
                'php_version' => $phpVersion,
                'laravel_version' => $laravelVersion,
                'uptime_seconds' => $uptimeSeconds,
                'checked_at' => $checkedAt,
            ],
            'cpu' => [
                'load_1m' => $cpu['load_1m'],
                'load_5m' => $cpu['load_5m'],
                'load_15m' => $cpu['load_15m'],
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
            'services' => $services,
            'warnings' => array_values(array_unique($warnings)),
        ]);
    }

    private function getCpuLoad(array &$warnings): array
    {
        $load1 = null;
        $load5 = null;
        $load15 = null;

        if (!function_exists('sys_getloadavg')) {
            $warnings[] = 'sys_getloadavg unavailable';
            return [
                'load_1m' => null,
                'load_5m' => null,
                'load_15m' => null,
            ];
        }

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

        if ($load1 === null && $load5 === null && $load15 === null) {
            $warnings[] = 'cpu load metrics unavailable';
        }

        return [
            'load_1m' => $load1,
            'load_5m' => $load5,
            'load_15m' => $load15,
        ];
    }

    private function getMemoryInfo(array &$warnings): array
    {
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

    private function getUptimeSeconds(array &$warnings): ?float
    {
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
}


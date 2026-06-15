# OpenSpec Design — Implement Real Server Monitor (Rencana Awal)

Dokumen ini adalah desain awal *yang masih rencana*, bukan implementasi kode.

## Planned backend endpoint
- `GET /api/server-monitor`

## Planned backend controller
- `backend/app/Http/Controllers/ServerMonitorController.php`

## Planned frontend service
- `frontend/src/services/serverMonitorService.ts`

## Planned frontend page integration
- `frontend/src/app/pages/ServerMonitor.tsx`

## Planned auth
- Endpoint harus berada di middleware `auth:sanctum`.
- Jangan putuskan admin-only dulu jika belum dikonfirmasi dari routing/sidebar kode aktual.

## Planned response shape
```json
{
  "server": {
    "hostname": "string|null",
    "os": "string|null",
    "php_version": "string|null",
    "laravel_version": "string|null",
    "uptime_seconds": "number|null",
    "checked_at": "ISO string"
  },
  "cpu": {
    "load_1m": "number|null",
    "load_5m": "number|null",
    "load_15m": "number|null"
  },
  "memory": {
    "total_bytes": "number|null",
    "used_bytes": "number|null",
    "free_bytes": "number|null",
    "usage_percent": "number|null"
  },
  "disk": {
    "total_bytes": "number|null",
    "used_bytes": "number|null",
    "free_bytes": "number|null",
    "usage_percent": "number|null"
  },
  "services": [
    {
      "name": "string",
      "status": "online|offline|unknown",
      "details": "string|null"
    }
  ],
  "warnings": ["string"]
}
```

## Safety design
- Jangan expose path sensitif, token, env value, database credentials, API key, password, atau isi `.env`.
- Jika metric tidak tersedia untuk Windows/Linux tertentu, return `null` dan tambahkan `warnings`, bukan error fatal.

## Cross-platform note
- Development di Windows dan deployment bisa Linux/homelab.
- Implementation harus graceful fallback (misalnya: load average/memory/disk metrics berbeda antar OS).

## Status tagging (anti-hallucination)
- `PLANNED` untuk semua item yang belum dikonfirmasi oleh kode aktual.
- `CONFIRMED` hanya dipakai jika ditemukan file/path yang sesuai.
- Jika pencarian kode tidak lengkap, gunakan `NOT FOUND`/`ASSUMPTION` secara hati-hati dan wajib menunggu audit Step 1.


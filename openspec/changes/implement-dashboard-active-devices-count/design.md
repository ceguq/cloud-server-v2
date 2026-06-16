# OpenSpec Design — implement-dashboard-active-devices-count

## Target UI
- Hanya mengganti angka widget **Active Devices Count** di `frontend/src/app/pages/Dashboard.tsx`.
- Widget lain dan desain besar Dashboard **tidak diubah** pada change ini.

## Data source
- Backend endpoint: **`GET /api/devices`**
- Frontend service: `frontend/src/services/deviceService.ts`
  - Method: `getDevices()`

## Response shape
Karena implementasi harus kecil, design hanya mengunci kebutuhan:
- Response dari `deviceService.getDevices()` harus dapat dihitung count-nya.
- Terkunci pada assumption bentuk response adalah array devices (hasil `.length`).

## UI behavior spesifik
### Loading
- Saat request berlangsung:
  - angka count ditampilkan sebagai `"..."` (bukan dummy angka).

### Error
- Jika request gagal:
  - angka count tampil `0`.
  - error state disimpan sederhana (boolean/flag) agar tidak crash.

### Empty state
- Jika user memiliki 0 device:
  - angka count tampil `0`.

## Computation logic
- `count = devices.length`
- Tidak menghitung dari data hardcoded.

## Non-goals (hard stop)
- Tidak menambahkan endpoint backend baru.
- Tidak mengubah `DeviceController`.
- Tidak mengerjakan Storage Breakdown, Server Status, Sync Status, Recent Activity.


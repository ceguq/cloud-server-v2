# implement-real-devices

## Summary
Menjadikan halaman **Devices** menjadi **real read-only** dengan backend API. Data device yang saat ini hardcoded/static di `frontend/src/app/pages/Devices.tsx` akan diganti menjadi data yang diambil dari backend melalui endpoint **`GET /api/devices`**.

## Problem
Saat ini halaman Devices merupakan UI-only:
- Data device berasal dari `const devices = [...]` (dummy).
- Status seperti **online/offline**, **trusted**, **lastSync**, **storage**, dan **ip** ditampilkan sebagai fakta, padahal tidak terhubung ke backend.
- Tombol seperti **Add Device**, **Force Sync**, **Trust/Untrust**, **Remove Device** masih belum mempunyai handler/API request nyata.

## Goals
Tahap 1 (MVP read-only, aman):
1. Menghapus ketergantungan `Devices.tsx` pada array dummy.
2. Menyediakan endpoint backend **read-only**: `GET /api/devices`.
3. Menampilkan device milik **user login** saja.
4. Menambahkan **loading**, **error**, dan **empty state** yang jujur (tanpa fallback dummy).
5. Menghindari aksi write (sync/trust/remove) pada tahap ini:
   - Tombol **Add Device / Force Sync / Trust-Untrust / Remove Device** dinonaktifkan atau diberi label non-aktif (placeholder) sampai endpoint write tersedia.

## Non-Goals
Tahap ini tidak mengimplementasikan:
- Force Sync.
- Add Device / provisioning/sync client.
- Trust/Untrust.
- Remove/revoke device.
- Dashboard widget **Active Devices** menjadi real.
- Desktop/mobile sync client.

## Impact
Komponen yang kemungkinan terdampak setelah implementasi disetujui (bukan di implementasi tahap dokumen ini):
- `backend/routes/api.php`
- `backend/app/Http/Controllers/DeviceController.php`
- `backend/app/Models/Device.php`
- `backend/database/migrations/<timestamp>_create_devices_table.php`
- `frontend/src/services/deviceService.ts`
- `frontend/src/app/pages/Devices.tsx`
- `frontend/src/app/pages/Dashboard.tsx` (hanya future, bukan tahap 1)


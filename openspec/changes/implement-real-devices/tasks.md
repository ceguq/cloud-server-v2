# implement-real-devices

## 1. Backend read-only foundation
- [x] Buat migration table **devices**: `backend/database/migrations/2026_06_15_000001_create_devices_table.php`.
  - Kolom minimal mengikuti desain tahap 1.
  - Catatan: User has manually run `php artisan migrate` untuk devices table.
- [x] Buat model **Device**: `backend/app/Models/Device.php`.
- [x] Buat controller **DeviceController**: `backend/app/Http/Controllers/DeviceController.php`.
- [x] Tambahkan route **read-only** `GET /api/devices` di `backend/routes/api.php` dalam grup `auth:sanctum`.
- [x] Pastikan query hanya mengembalikan devices milik user yang sedang terautentikasi.
- [x] Definisikan bentuk response (`data` + `meta` bila paginasi digunakan).

## 2. Device registration/update (minimal, menunggu keputusan implementasi)
Tahap ini hanya ditulis sebagai rencana untuk implementasi setelah design final.
- [ ] Tentukan alur create/update device record berdasarkan login/request.
- [ ] Pastikan tidak menyimpan token asli.
- [ ] Terapkan pembatasan frekuensi update `last_seen_at` (debounce/coarse-grain) bila diperlukan.

## 3. Frontend service
- [x] Buat file `frontend/src/services/deviceService.ts`.
  - Step 2 frontend service has been reviewed and is ready for Devices.tsx integration.
  - Define type untuk payload device.
  - Gunakan service umum `frontend/src/services/api.ts`.
  - Implementasikan method: `getDevices()` (panggilan ke `GET /api/devices`).

## 4. Frontend Devices page integration
- [x] Update `frontend/src/app/pages/Devices.tsx` untuk:
  - Menghapus ketergantungan pada `const devices = [...]`.
  - Memanggil `deviceService.getDevices()`.
  - Menambahkan loading state, error state, dan empty state.
  - Tombol aksi write:
    - Disable atau relabel sampai endpoint write ada.
- [x] Pastikan tidak ada data dummy tampil sebagai fallback.

## 5. Verification checklist (manual)
- [x] Login sebagai user.
- [x] Buka route `/devices` (verifikasi manual dengan Bearer token berhasil; response kosong `{}` normal karena belum ada record devices).
- [x] Pastikan list devices berasal dari API (bukan dummy).
- [x] Jika user memiliki 0 devices, pastikan tampil empty state yang jujur.
- [ ] Jika API gagal, pastikan tampil error state yang aman.
- [x] Pastikan Server Monitor tidak berubah.

## 6. Documentation final
- [x] Update `PROJECT_STRUCTURE.md` setelah implementasi selesai dan tervalidasi.
  - PROJECT_STRUCTURE.md synchronized: Devices marked as Partial / Real API read-only across main documentation sections.
  - Updated all references from `🔴 Placeholder` to `🟡 Partial` for Devices.
  - Added GET /api/devices endpoint to API route listing.
  - Updated feature status checklist, routing table, and conclusion sections.
  - Maintained future scope for write actions (registration/update/sync/trust/revoke).

## Documentation Final Note

- [x] PROJECT_STRUCTURE.md synchronized with implementation status (2026-06-15).

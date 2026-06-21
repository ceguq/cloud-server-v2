# OpenSpec Tasks Checklist: implement-gdrive-trash-management

- [ ] Tambah method `moveToTrash` di `backend/app/Services/GoogleDriveService.php`
  - Implementasi: panggil Google Drive API `files.update` dengan payload `trashed=true`
- [ ] Tambah method `restoreFromTrash` di `backend/app/Services/GoogleDriveService.php`
  - Implementasi: panggil Google Drive API `files.update` dengan payload `trashed=false`

- [ ] Tambah route trash dan restore di `backend/routes/api.php`
  - `POST /api/gdrive/accounts/{account}/files/{fileId}/trash`
  - `POST /api/gdrive/accounts/{account}/files/{fileId}/restore`

- [ ] Tambah controller method trash/restore di `backend/app/Http/Controllers/GDriveController.php`
  - Handler memvalidasi akun milik user dan status revoked
  - Memanggil service `moveToTrash` / `restoreFromTrash`

- [ ] Tambah frontend service function `trashGDriveFile` di `frontend/src/services/gdriveService.ts`
  - Fungsi memanggil endpoint `POST .../trash`

- [ ] Aktifkan tombol Trash di dropdown GDrive (di `frontend/src/app/pages/GDrive.tsx`)
  - Pastikan tombol Trash memanggil endpoint move-to-trash (bukan trash lokal Nimbus)

- [ ] Setelah trash sukses, refresh list file GDrive
  - Trigger refresh dengan mekanisme yang sudah ada (mis. `refreshTick`)

- [ ] Pastikan file GDrive tidak diarahkan ke Trash lokal Nimbus
  - Validasi wiring UI/endpoint

- [ ] Build check manual oleh user

- [ ] Manual test: Trash file dari GDrive hilang dari list normal
  - Langkah:
    1) Buka tab/halaman GDrive
    2) Pilih file
    3) Klik Trash di dropdown
    4) Pastikan file hilang dari listing All/Starred/Shared/Recent sesuai query
    5) Pastikan tidak ada perubahan pada trash lokal Nimbus


## Design: GDrive Upload MVP (OpenSpec)

### Overview
MVP upload dilakukan **frontend-only UX + backend endpoint baru** untuk meng-upload **1 file** ke Google Drive **accountId** yang dipilih user.

### Backend
- Perlu endpoint baru untuk upload ke Google Drive account tertentu.
- Perlu method service untuk upload file ke Google Drive.
- Endpoint harus menerima:
  - `accountId`
  - file binary (multipart) + metadata minimal (nama/type bila ada)

### OAuth scope (catatan penting)
- Saat ini kemungkinan OAuth scope masih **read-only**.
- Upload membutuhkan scope **write** yang sesuai.
- OpenSpec ini **tidak menentukan scope final secara sembrono**; scope perlu diverifikasi saat audit implementasi.

### Upload behavior
- MVP **tidak** memakai resumable upload.
- Cukup multipart/simple upload untuk ukuran file kecil/normal.

### Validasi awal
- account harus connected
- file wajib ada
- upload error ditampilkan ke user
- setelah sukses: refresh file list untuk akun tersebut

### Frontend
- GDrive.tsx perlu tombol upload kecil untuk **active account**.
- Frontend perlu function baru di `gdriveService.ts` untuk upload file ke `accountId` yang dipilih.
- Upload harus memakai `accountId` yang dipilih, bukan asumsi global.

### State UI
- loading
- error
- success (dan refresh list)


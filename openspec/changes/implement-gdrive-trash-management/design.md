# OpenSpec Design: implement-gdrive-trash-management

## Desain API
### 1) Move to Trash
- **Method**: POST
- **Path**: `/api/gdrive/accounts/{account}/files/{fileId}/trash`
- **Tujuan**: memindahkan file Google Drive ke trash.
- **Implementasi backend**:
  - Gunakan Google Drive API `files.update`.
  - Request body minimal:
    - `trashed: true`
- **Listing normal**:
  - Backend untuk listing normal harus tetap query `trashed=false`.
  - Karena itulah file yang di-trash akan hilang dari list normal.

### 2) Restore from Trash
- **Method**: POST
- **Path**: `/api/gdrive/accounts/{account}/files/{fileId}/restore`
- **Tujuan**: mengembalikan file dari trash ke normal.
- **Implementasi backend**:
  - Gunakan Google Drive API `files.update`.
  - Request body minimal:
    - `trashed: false`
- **Listing normal**:
  - Tetap query `trashed=false`.
  - File yang sudah restore akan kembali muncul pada list normal.

## Desain Backend (tingkat implementasi)
Komponen yang akan ditambah (sesuai rencana):
- `GoogleDriveService`
  - `moveToTrash(GDriveAccount $account, string $fileId)`
  - `restoreFromTrash(GDriveAccount $account, string $fileId)`
- `GDriveController`
  - method handler: `trash(...)` dan `restore(...)`
- `backend/routes/api.php`
  - route POST untuk trash dan restore

Catatan desain penting (aturan yang harus dipatuhi):
- Tidak mengarah ke trash lokal Nimbus.
- Tidak menghapus data lokal (hard delete) maupun soft delete lokal.
- Tidak mengubah controller/service lain terkait trash lokal.

## Desain Frontend (tingkat implementasi)
Walaupun UI code tidak akan diubah pada tahap OpenSpec ini, desain yang diinginkan:
- Pada dropdown aksi file GDrive:
  - Tombol **Trash** menjalankan endpoint move-to-trash.
  - Setelah sukses, lakukan refresh list file GDrive.

## Error handling (konsep)
- Jika account tidak valid/disconnected:
  - Backend mengembalikan error 404/422 sesuai pattern controller yang ada.
- Jika Google API gagal:
  - Backend mengembalikan response error 502 dengan message yang jelas dan tanpa token bocor.
- Frontend:
  - Menampilkan alert/error toast (sesuai pola yang sudah ada).

## Non-collision: GDrive trash vs Nimbus local trash
- Trash GDrive diset lewat `files.update(trashed=true/false)`.
- Listing normal sudah `trashed=false`.
- Tidak ada perubahan pada tabel/route trash lokal (`/trash/*`).

## Security / Auth
- Route ini menggunakan middleware auth:sanctum seperti route API lainnya.
- Backend tetap memvalidasi:
  - `account.user_id` sama dengan `request->user()->id`.
  - `revoked_at` null (akun terkoneksi).

## Acceptance Criteria (desain)
1. Trash file GDrive dari UI Nimbus:
   - memanggil endpoint move-to-trash.
   - file hilang dari listing normal dalam UI (refresh).
2. Restore file dari trash (bila action tersedia):
   - memanggil endpoint restore.
   - file kembali muncul di listing normal.
3. Listing normal tidak pernah menampilkan `trashed=true` file.
4. Tidak ada penghapusan file Nimbus lokal.
5. Tidak ada permanent delete.


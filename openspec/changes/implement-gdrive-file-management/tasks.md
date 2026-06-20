# OpenSpec Tasks: Implement GDrive File Management

> Checklist untuk memastikan desain sesuai requirement: read-only (open/download/preview) dulu, write belakangan.

## 1) Audit read-only connector saat ini
- [x] Pastikan mekanisme connector sudah jelas untuk:
  - list akun (`GET /gdrive/accounts`)
  - list file aggregate (`GET /gdrive/files`)
  - list file per akun (`GET /gdrive/accounts/{account}/files`)
- [x] Pastikan scope default masih `https://www.googleapis.com/auth/drive.readonly`.


## 2) Audit kebutuhan data UI untuk preview
- [x] Tentukan field metadata minimal yang diperlukan untuk “preview metadata/file info”:
  - nama
  - tipe MIME
  - ukuran
  - modified/created jika tersedia
  - owner
  - links aman
- [x] Tentukan kebutuhan untuk resolusi `account_id` per item file.


## 3) Desain endpoint read-only (open/download/metadata preview)
- [x] Preview metadata/file info dari data existing sudah diimplementasikan di frontend (modal details).

- [x] Desain endpoint open file:
  - pastikan tidak membocorkan access token ke browser
  - tentukan apakah berupa redirect atau proxy open
- [x] Desain endpoint download via backend proxy:
  - [x] Endpoint: `GET /api/gdrive/accounts/{account}/files/{fileId}/download`

  - [x] Streaming download (fase binary)
  - [x] Header `Content-Type` & `Content-Disposition`
  - [x] Validasi account tidak revoked
  - [x] Workspace export belum didukung (return JSON 422)
  - [x] Endpoint berada di group `auth:sanctum`




## 4) Keamanan OAuth untuk read-only
- [x] Token tidak dikirim ke frontend untuk endpoint download proxy.
- [x] Logging tidak menuliskan token untuk flow yang sudah dibuat.


## 5) Siapkan blueprint write actions (tanpa implementasi)
- [x] Tambahkan daftar endpoint write yang direncanakan:
  - rename file
  - delete/trash file
  - upload file
  - move file/folder (jika diperlukan)
- [x] Tetapkan requirement scope write tambahan:
  - `https://www.googleapis.com/auth/drive`
- [x] Tetapkan strategi gating:
  - jika account hanya punya `drive.readonly` → write endpoint harus return error jelas dan minta reconnect/consent ulang
  - read-only tetap jalan meski user belum reconnect.


## 6) Validasi dampak perubahan scope
- [x] Dokumentasikan bahwa perubahan scope OAuth butuh consent/reconnect ulang.
- [x] Token lama read-only tidak dianggap cukup untuk write; read-only tetap jalan meski user belum reconnect.


## 7) Final consistency check dokumen
- [ ] Pastikan proposal mencakup problem/goal/non-goals dan scope fase awal vs fase lanjutan.
- [ ] Pastikan design mencakup:
  - endpoint planned
  - service methods planned
  - perubahan scope OAuth
  - risiko keamanan dan mitigasinya
- [ ] Pastikan tasks checklist memprioritaskan read-only flow dulu, write belakangan.


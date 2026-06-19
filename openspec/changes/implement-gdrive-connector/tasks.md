# Implement GDrive Connector (Multi-Account) — Tasks

> Checklist step-by-step. Jangan dikerjakan sekaligus dalam satu langkah besar.

## 0. Preconditions (Dokumen/Scope)
- [ ] Pastikan scope proyek: **hanya OpenSpec** pada perubahan ini.
- [ ] Target MVP: **read-only** (list akun, list file, storage usage, disconnect).

## 1. Add config/env placeholders
- [x] Tambahkan placeholder untuk:
  - Google OAuth client id/secret,
  - redirect/callback URL,
  - default scopes untuk read-only.
- [x] Dokumentasikan nilai yang dibutuhkan (tanpa implement detail).


## 2. Add migration/model `GDriveAccount`
- [x] Buat skema `gdrive_accounts` sesuai design.
- [x] Terapkan encrypted cast untuk `access_token` dan `refresh_token`.
- [x] Pastikan kolom metadata (email, label, scopes, connected_at, revoked_at, dsb.).


## 3. Add OAuth routes/controller skeleton
- [x] Buat routing skeleton untuk:
  - `GET /api/gdrive/connect` (tetap authenticated)
  - `GET /api/gdrive/callback` (public callback endpoint)
- [x] Buat controller skeleton tanpa business logic penuh dulu (placeholder).
- [x] OAuth state dibuat stateless terenkripsi (tanpa session).


## 4. Add `GoogleDriveService` token refresh skeleton

- [ ] Buat class `GoogleDriveService` sebagai abstraction layer.
- [ ] Implement skeleton:
  - ambil token dari model,
  - cek token expired,
  - refresh token (placeholder).

## 5. Add account list API
- [ ] Implement `GET /api/gdrive/accounts`.
- [ ] Return daftar akun (tanpa token) dan status koneksi.

## 6. Add file list API read-only
- [ ] Implement `GET /api/gdrive/files` (aggregate across accounts).
- [ ] Implement `GET /api/gdrive/accounts/{account}/files`.
- [ ] Pastikan perilaku read-only dan mendukung paging sederhana bila diperlukan.

## 7. Connect React GDrive UI to API
- [ ] Hubungkan halaman `/gdrive` dengan API internal:
  - load akun terhubung,
  - load list file,
  - switch antara per akun dan semua akun.
- [ ] Pastikan UI hanya menerima data non-sensitif.

## 8. Add disconnect/revoke
- [ ] Implement `DELETE /api/gdrive/accounts/{account}`.
- [ ] Best-effort revoke di Google, lalu set `revoked_at`.
- [ ] Setelah disconnect, UI refresh status koneksi.

## 9. Add cache/queue later
- [ ] Rencanakan peningkatan performa:
  - caching list file per akun,
  - background sync via queue.
- [ ] Update design jika perlu (fase berikutnya).


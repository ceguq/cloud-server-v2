# Implement GDrive Connector (Multi-Account) — Tasks

> Checklist step-by-step. Jangan dikerjakan sekaligus dalam satu langkah besar.

## 0. Preconditions (Dokumen/Scope)
- [x] Pastikan scope proyek: **hanya OpenSpec** pada perubahan ini.
- [x] Target MVP: **read-only** (list akun, list file, storage usage, disconnect).

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
- [x] Buat class `GoogleDriveService` sebagai abstraction layer.
- [x] Implement skeleton:
  - ambil token dari model,
  - cek token expired,
  - refresh token (placeholder).



## 5. Add account list API
- [x] Implement `GET /api/gdrive/accounts`.
- [x] Return daftar akun (tanpa token) dan status koneksi.

### 5X. Add frontend Google Drive API service
- [x] Add frontend Google Drive API service.


### 5A. Google Drive about metadata helper
- [x] Add Google Drive about metadata helper.




### 6B. Verify OAuth callback token exchange and account metadata without persisting
- [x] Verify OAuth callback token exchange and account metadata without persisting.

### 6C. Persist connected Google Drive account after OAuth callback
- [x] Persist connected Google Drive account after OAuth callback.





## 6. Add file list API read-only
- [x] Add Google Drive files list helper.
- [x] Implement `GET /api/gdrive/files` (aggregate across accounts).
- [x] Implement `GET /api/gdrive/accounts/{account}/files`.
- [x] Pastikan perilaku read-only dan mendukung paging sederhana bila diperlukan.

## 7. Connect React GDrive UI to API
- [x] Load connected Google Drive accounts in frontend.
- [x] Load aggregate Google Drive file list in frontend.
- [x] Add frontend file scope switch for all accounts vs selected account.
- [x] Hubungkan halaman `/gdrive` dengan API internal:


  - load akun terhubung,
  - load list file,
  - switch antara per akun dan semua akun.
- [x] Pastikan UI hanya menerima data non-sensitif.



## 8. Add disconnect/revoke
- [x] Implement `DELETE /api/gdrive/accounts/{account}`.
- [x] Best-effort revoke di Google, lalu set `revoked_at`.
- [x] Setelah disconnect, UI refresh status koneksi.


## 9. Add cache/queue later
- [x] Rencanakan peningkatan performa:
  - caching list file per akun,
  - background sync via queue.
- [x] Update design jika perlu (fase berikutnya).


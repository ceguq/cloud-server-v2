# Implement GDrive Connector (Multi-Account) — Design

## 1) Arsitektur

### Backend (Laravel)
- Menjadi handler utama OAuth dan integrasi Google Drive.
- Menangani:
  - flow OAuth (redirect, callback, exchange code→token),
  - penyimpanan token terenkripsi,
  - refresh token otomatis,
  - pemanggilan Google Drive API.

### Frontend (React)
- Hanya memanggil API internal NimbusDrive V2:
  - `/api/gdrive/*`
- UI tidak mengetahui maupun menyimpan token.

### Service Layer: `GoogleDriveService`
- Bertugas untuk:
  - mengambil token user+account dari database,
  - refresh access token bila expired,
  - membuat request ke Google Drive API,
  - mengembalikan data read-only (list file, storage usage).

## 2) Model/Tabel: `gdrive_accounts`

Rancang tabel `gdrive_accounts` untuk menyimpan metadata akun dan token OAuth.

**Kolom yang disarankan:**
- `id`
- `user_id`
- `label`
- `email`
- `google_account_id` nullable
- `access_token` encrypted text
- `refresh_token` encrypted text
- `token_expires_at` nullable datetime
- `scopes` json nullable
- `avatar_url` nullable
- `connected_at` nullable datetime
- `last_synced_at` nullable datetime
- `revoked_at` nullable datetime
- `created_at`
- `updated_at`

## 3) Encrypted Cast (Wajib)
- `access_token` dan `refresh_token` **harus** memakai **encrypted cast** pada model.
- Tujuan:
  - memastikan token tidak tersimpan plaintext,
  - memudahkan rotasi/upgrade mekanisme enkripsi di masa depan.

## 4) Endpoint Internal (Read-only untuk MVP)

> Catatan: endpoint ini untuk konsumsi React internal (auth via session/token NimbusDrive), bukan langsung ke Google.

1. `GET /api/gdrive/accounts`
   - Mengembalikan daftar akun Drive terhubung milik user.

2. `GET /api/gdrive/connect`
   - Mempersiapkan OAuth connect (mis. membuat state/nonce dan mengembalikan URL redirect) / memulai redirect.

3. `GET /api/gdrive/callback`
   - Callback OAuth Google.
   - Exchange `code` → token.
   - Simpan token terenkripsi.

4. `DELETE /api/gdrive/accounts/{account}`
   - Disconnect / revoke akun.

5. `GET /api/gdrive/files`
   - List file dari **semua** akun terhubung.

6. `GET /api/gdrive/accounts/{account}/files`
   - List file untuk **satu** akun tertentu.

7. `GET /api/gdrive/accounts/{account}/storage`
   - Return storage usage per akun.

## 5) OAuth Flow (Ringkas)

1. User klik **Connect Drive**.
2. Backend redirect ke **Google consent screen**.
3. Google mengembalikan callback ke backend (`/api/gdrive/callback`) membawa `code`.
4. Backend exchange `code` menjadi access token + refresh token.
5. Backend simpan:
   - metadata akun (email, label, avatar, google_account_id bila tersedia),
   - `access_token` dan `refresh_token` (terenkripsi),
   - `token_expires_at`, `scopes`, serta timestamp `connected_at`.
6. Frontend hanya menerima status koneksi (contoh: refresh halaman / fetch akun terbaru).

## 6) Risiko & Mitigasi

1. **Refresh token sensitif**
   - Mitigasi: enkripsi di backend (encrypted cast).
   - Batasi akses internal & logging (hindari log token).

2. **Restricted scopes**
   - Risiko: jika memilih `drive.readonly`, fitur tertentu mungkin terbatas.
   - Mitigasi: pastikan scopes MVP benar untuk kebutuhan list/read.

3. **Rate limit / quota Google**
   - Mitigasi awal: pembatasan jumlah request per user dan batasi paging.
   - Mitigasi lanjutan: cache dan batch request.

4. **Perlu cache untuk list file**
   - Mitigasi: sediakan struktur `last_synced_at` dan desain untuk caching (fase berikutnya).

5. **Revoke saat disconnect**
   - Mitigasi: endpoint `DELETE` melakukan revoke akses Google (best-effort) lalu menandai `revoked_at`.

## 7) OAuth callback redirect (frontend)
- Callback sukses melakukan redirect ke halaman frontend GDrive menggunakan:
  - `config('app.frontend_url')` untuk base URL,
  - lalu path: `/gdrive?gdrive=connected`.




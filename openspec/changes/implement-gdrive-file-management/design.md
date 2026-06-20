# OpenSpec: Implement Google Drive File Management (Design)

> Fokus dokumen: desain endpoint/service yang direncanakan untuk mendukung
> open/download/preview (read-only sekarang) dan write actions (fase lanjutan).
>
> Tidak ada implementasi coding pada tahap ini.

## Assumsi & Konteks
- NimbusDrive sudah memiliki connector multi-account untuk Google Drive.
- OAuth scope saat ini masih: `https://www.googleapis.com/auth/drive.readonly`.
- Token OAuth (access_token/refresh_token) disimpan di backend dan **tidak** dikirim ke frontend.

## Endpoint backend yang direncanakan
### Read-only management (Fase awal)

1. **Get metadata / file info untuk preview**
- Endpoint (contoh):
  - `GET /api/gdrive/files/{fileId}/metadata`
  - atau jika diperlukan: `GET /api/gdrive/accounts/{account}/files/{fileId}/metadata`
- Output minimal:
  - id, name, mimeType
  - size (jika ada)
  - createdTime, modifiedTime
  - owners/displayName (jika ada)
  - shared/starred (jika ada)
  - info tambahan yang dibutuhkan UI untuk preview

2. **Open file (tab baru)**
- Tujuan: membuka file tanpa mengekspos token OAuth ke browser.
- Ada 2 opsi desain (pilih salah satu):
  - **Opsi A (Recommended untuk read-only):** backend membuat URL “open” yang aman melalui Google redirect/preview URL yang tersedia di metadata, atau
  - **Opsi B:** frontend membuka route backend (mis. `/api/gdrive/proxy/open?fileId=...`) yang akan mengalirkan/redirect ke resource tujuan.

Contoh endpoint:
- `GET /api/gdrive/files/{fileId}/open`
  - Menghasilkan response yang browser bisa membuka (redirect atau streaming proxy non-token exposure).

3. **Download file lewat backend proxy**
- Endpoint:
  - `GET /api/gdrive/files/{fileId}/download`
  - (opsional) `?accountId=...` atau path menggunakan account: `/accounts/{account}/files/{fileId}/download`
- Perilaku:
  - backend mengambil token milik account
  - backend melakukan request ke Google Drive “download” endpoint
  - backend mengalirkan (stream) content ke client
  - header aman (mis. `Content-Type`, `Content-Disposition`) ditetapkan agar download bekerja

4. **Resolve file to correct account (jika perlu)**
Karena fitur list file bisa aggregate multi-account, desain perlu menyelesaikan “fileId berasal dari account yang mana”.
- Kemungkinan mekanisme:
  - payload UI sudah menyertakan `account_id`/`account_email` saat list
  - atau backend endpoint metadata/download menerima `account_id` secara eksplisit

### Write management (Fase lanjutan)
Planned write endpoints (tanpa detail implementasi sekarang):
- rename:
  - `PATCH /api/gdrive/files/{fileId}` (atau `/rename`)
- delete/trash:
  - `DELETE /api/gdrive/files/{fileId}` atau endpoint khusus `trash/restore`
- upload:
  - `POST /api/gdrive/files/upload`
- move (jika diperlukan):
  - `PATCH /api/gdrive/files/{fileId}/move`
  - `PATCH /api/gdrive/folders/{folderId}/move`

## Scope requirement untuk read-only vs write
- Read-only tetap memakai: `https://www.googleapis.com/auth/drive.readonly`.
- Write butuh scope tambahan kemungkinan: `https://www.googleapis.com/auth/drive`.

## Gating read-only vs write
- Jika account hanya punya `drive.readonly`, endpoint write harus return error jelas.
- Error harus meminta user untuk melakukan reconnect/consent ulang.
- Read-only tetap jalan walau user belum reconnect.

## Security untuk write endpoints (konseptual)
- Token tetap tidak dikirim ke frontend.
- Jangan log token/secret.
- Write endpoint wajib memvalidasi:
  - account milik user login
  - account tidak revoked
  - request operation hanya menggunakan token yang sesuai scope write


## Service method yang direncanakan
Penambahan method pada service layer (mis. `GoogleDriveService`), dengan fokus read-only terlebih dahulu.

### Read-only
1. `getFileMetadata(GDriveAccount $account, string $fileId): array`
- mengambil metadata via Google Drive API (fields minimal yang dipakai UI)

2. `buildOpenUrl(GDriveAccount $account, array $fileMetadata): string`
- menyiapkan URL “open” aman untuk browser (berbasis metadata yang didapat)

3. `proxyDownload(GDriveAccount $account, string $fileId): Stream/Response`
- melakukan request ke Google Drive untuk content file
- mengembalikan streaming response ke client

4. `ensureFreshAccessToken(GDriveAccount $account): GDriveAccount`
- sudah ada; dipakai ulang untuk read-only endpoints

### Write (fase lanjutan)
- `renameFile(...)`
- `trashFile(...)` / `deleteFile(...)`
- `uploadFile(...)`
- `moveFile(...)` / `moveFolder(...)`

## Perubahan scope OAuth
### Kondisi saat ini (Read-only)
- Tetap: `https://www.googleapis.com/auth/drive.readonly`

### Scope untuk write actions (fase lanjutan)
- Perlu scope tambahan, kemungkinan:
  - `https://www.googleapis.com/auth/drive`
  - atau scope spesifik lain yang sesuai.

### Dampak pada user
- Setiap perubahan scope menuntut user melakukan **reconnect/consent ulang**.
- Arsitektur gated:
  - sistem memeriksa apakah account memiliki scope write sebelum menjalankan write endpoints
  - jika tidak ada, endpoint harus menolak dengan error yang mengarahkan user untuk reconnect

## Risiko keamanan token dan write permission
1. **Risiko token bocor ke frontend**
- Mitigasi:
  - token hanya disimpan dan digunakan di backend
  - endpoint download/open harus menjadi “proxy/redirect” yang tidak mengirim access_token ke browser

2. **Risiko write permission salah saat scope tidak cukup**
- Mitigasi:
  - validasi scope pada saat request write
  - fallback: read-only tetap bekerja tanpa mengharuskan user reconnect, sedangkan write harus request reconnect

3. **Risiko logging token / payload sensitif**
- Mitigasi:
  - hindari logging access_token/refresh_token
  - jika error terjadi, log hanya metadata non-sensitif (mis. fileId, accountId)

4. **Risiko SSRF / header injection pada proxy**
- Mitigasi:
  - hanya panggil Google endpoint yang “known/allowlisted”
  - set header response secara terkontrol

## Catatan integrasi dengan “aggregate file list”
- Karena `GET /gdrive/files` dapat aggregate dari banyak akun, UI perlu menyertakan `account_id` bersama setiap item file agar open/download bisa mengacu ke account yang benar.
- Jika UI tidak menyertakan account_id, backend harus melakukan resolusi tambahan (dengan potensi biaya API). Desain endpoint metadata/download sebaiknya mendukung input `account_id` untuk efisiensi.


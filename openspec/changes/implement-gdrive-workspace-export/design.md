# OpenSpec Design: Google Drive Workspace Export

## Ringkasan
Backend saat ini melakukan binary download proxy untuk file non-Workspace menggunakan:
- endpoint Google Drive: `files/{fileId}?alt=media`

Untuk Google Workspace files, backend harus melakukan **Drive API export**:
- `files/{fileId}/export?mimeType=...`

Endpoint backend yang diekspos ke frontend **tetap sama**:
- `GET /gdrive/accounts/{account}/files/{fileId}/download`

## MIME type mapping (Google Workspace)
Deteksi berdasarkan `mimeType`/`mime_type` dari metadata file:
- `application/vnd.google-apps.document` → Google Docs
- `application/vnd.google-apps.spreadsheet` → Google Sheets
- `application/vnd.google-apps.presentation` → Google Slides
- `application/vnd.google-apps.drawing` → Google Drawings

## Export endpoint Google Drive
Gunakan endpoint export berikut (Drive API):
- `GET https://www.googleapis.com/drive/v3/files/{fileId}/export?mimeType={targetMime}`

## Endpoint backend tetap sama
Frontend tetap memanggil endpoint yang sudah ada:
- `GET /gdrive/accounts/{account}/files/{fileId}/download`

Controller/service yang mengubah behavior hanyalah internal: memilih rute `alt=media` vs `export`.

## Service detection & routing
Tambahkan logika (conceptual) di service:

1. Jika `mime_type` termasuk salah satu Google Workspace mime type di atas:
   - mapping ke daftar target export format
   - pilih **default target** (sesuai keputusan export default di proposal)
   - panggil Google Drive API export endpoint
   - stream hasil export ke response client dengan:
     - `Content-Type` sesuai `targetMime`
     - `Content-Disposition` dengan filename yang punya extension sesuai target

2. Jika `mime_type` bukan Workspace mime type:
   - tetap gunakan binary download logic yang ada (tidak diubah)
   - tetap streaming dari `alt=media`

## Filename extension mapping
Default extension (berdasarkan keputusan export default):
- **Doc PDF** → `.pdf`
- **Sheet XLSX** → `.xlsx`
- **Slides PDF/PPTX**
  - default → `.pdf`
  - jika fallback/opsi lain → `.pptx`
- **Drawing PNG/PDF**
  - default → `.png`
  - fallback → `.pdf`

Catatan: filename harus dibersihkan dari karakter quote (`"`) untuk membentuk `Content-Disposition` header.

## Security
- Token OAuth **tetap backend-only**.
- Jangan expose access_token/refresh_token ke frontend.
- Jangan log token/secret.
- Validasi ownership tetap ada di backend:
  - `GDriveAccount.user_id` harus cocok dengan user login.
- Pastikan response error tidak mengandung token/secret.

## Error handling
- Jika export gagal (format target tidak didukung, error Drive, dll):
  - backend mengembalikan JSON aman (mis. `message` generic)
  - frontend tetap menampilkan error umum (sesuai flow download yang saat ini ada)

## Compatibility constraints
- Tidak mengubah contract endpoint backend:
  - path dan method tetap
- Tidak mengubah struktur handler frontend download button:
  - frontend tetap memakai service `downloadGDriveFile(accountId, fileId, name)`
- Read-only scope tetap.


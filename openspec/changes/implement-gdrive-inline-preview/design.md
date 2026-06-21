## Overview
Implementasikan **inline file preview** pada halaman GDrive dengan pendekatan **frontend-only first**, menggunakan **blob** dari existing authenticated download/export proxy.

## Data source
1. **Metadata file dari GDrive row** (tersedia di UI)
   - `id` (fileId)
   - `accountId`
   - `name`
   - `mime` (mime_type)
   - (opsional untuk detail) ukuran `sizeBytes`

2. **Blob content via existing download/export endpoint**
   - Reuse endpoint yang sudah ada:
     - `GET /api/gdrive/accounts/{account}/files/{fileId}/download`
   - Endpoint ini sudah mengembalikan blob untuk file dan workspace export yang relevan.

## Frontend-only first approach
- Tidak menambah endpoint backend.
- Tidak menambah perubahan OAuth.
- Perubahan hanya pada logika frontend untuk:
  - mengklasifikasikan jenis preview (preview kind)
  - mengambil blob untuk preview (tanpa memaksa download)
  - merender preview di UI modal inline

## Preview modal state di implementasi berikutnya (GDrive.tsx)
State yang direncanakan (konseptual):
- `previewModalOpen: boolean`
- `previewTarget: { fileId, accountId, mime, name, sizeBytes } | null`
- `previewKind: PreviewKind | null`
- `previewBlobUrl: string | null`
- `previewError: string | null`
- `previewLoading: boolean`

Alur state:
1. User klik **Preview** pada dropdown.
2. Frontend menentukan `previewKind` dari metadata (`mime` + `name/extension`) dan aturan scope.
3. Jika `previewKind` unsupported:
   - tampilkan pesan “Preview not available”
   - tetap tampilkan/biarkan aksi Open & Download/Export (tidak mengubah dropdown behavior existing pada implementasi berikutnya).
4. Jika didukung:
   - fetch blob melalui existing download/export proxy
   - `createObjectURL(blob)` → simpan sebagai `previewBlobUrl`
   - render preview inline di modal

## Blob URL lifecycle
- Gunakan `URL.createObjectURL(blob)` ketika blob preview sudah didapat.
- Revoke object URL saat modal ditutup atau saat target file berubah:
  - `URL.revokeObjectURL(previewBlobUrl)`
- Pastikan tidak ada memory leak ketika user membuka preview untuk beberapa file berturut-turut.

## Text preview size guard
- Text/code kecil saja agar tidak memuat file besar ke memory browser.
- Guard yang direncanakan:
  - jika `sizeBytes` tersedia dan melebihi limit (contoh: 256KB–1MB, ditetapkan saat implementasi), jangan fetch/atau jangan render inline; tampil fallback “Preview not available”.
  - jika `sizeBytes` tidak tersedia, gunakan limit berbasis praktik aman di implementasi (mis. batasi maksimal bytes yang di-try to read).

## Fallback untuk unsupported file
- Jika file tidak termasuk kategori preview yang didukung, UI menampilkan:
  - **“Preview not available”**
- Aksi **Open** dan **Download/Export** tetap tersedia dan tidak terpengaruh.

## Google Workspace handling (berdasarkan export/download)
- Google Docs → export PDF → render via `<iframe>` atau `<object>` (tergantung implementasi yang dipilih berikutnya) dengan blob URL.
- Google Slides → export PDF → render via `<iframe>` / `<object>`.
- Google Drawing → export PNG → render via `<img>`.
- Google Sheets → fallback:
  - bila inline preview tidak kompatibel, gunakan fallback berupa tindakan download/open dari action yang sudah ada pada implementasi berikutnya.
  - tetap tanpa perubahan backend.

## Tidak ada backend/API/OAuth change
- Tidak ada pembuatan endpoint baru.
- Tidak ada perubahan scope OAuth.
- Tidak ada perubahan logic list accounts/list file.
- Tidak ada perubahan endpoint download/export yang sudah berjalan.


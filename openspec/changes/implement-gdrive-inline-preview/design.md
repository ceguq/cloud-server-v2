## Design overview
Implement inline preview di halaman **frontend/src/app/pages/GDrive.tsx** sebagai **modal/overlay** terpisah (state di GDrive.tsx), dengan sumber data **blob** dari endpoint download/proxy yang sudah ada.

## Reuse yang sudah ada
1. **Frontend service**: reuse `getGDriveFileBlob(accountId, fileId)` dari `frontend/src/services/gdriveService.ts`.
2. **Pola UI**: reuse pola modal/side-panel yang sudah ada (contoh: “Details” modal) dengan gaya serupa, tapi tanpa memindahkan logic besar.

## State yang ditambahkan (konseptual di implementasi berikutnya)
Di GDrive.tsx tambahkan state modal preview, misalnya:
- `previewModalOpen`
- `previewTarget` (fileId, accountId, mime, name, sizeBytes)
- `previewKind` (image/pdf/video/audio/text/unsupported/workspace-fallback)
- `previewLoading`
- `previewError`
- `previewBlobUrl` (string | null)

## Mapping jenis preview (minimal)
- `mime === image/*` → `<img src={blobUrl} />`
- `mime === application/pdf` → `<iframe src={blobUrl} />` atau `<object>`
- `mime.startsWith('video/')` → `<video controls src={blobUrl} />`
- `mime.startsWith('audio/')` → `<audio controls src={blobUrl} />`
- `mime.startsWith('text/')` + varian aman (plain/csv/md/json/xml/html/css, dst) → text view dengan **limit aman**

## Guard untuk text/code
- Gunakan `sizeBytes` untuk membatasi:
  - Jika melebihi limit (ditetapkan saat implementasi, mis. ratusan KB–1MB), jangan render inline → tampilkan fallback.
- Jika `sizeBytes` tidak tersedia, gunakan strategi defensif (batasi maksimal bytes yang akan diproses/ditampilkan).

## Google Workspace files
- Workspace file (Docs/Sheets/Slides/Drawing) **tidak** di-preview via blob mentah.
- Untuk iterasi awal: tampilkan fallback **"Open in Google Drive"**.
  - (Jika pada implementasi berikutnya backend export untuk workspace sudah menghasilkan blob previewable, barulah bisa diarahkan, tapi non-goal ini adalah memaksa workspace blob inline preview sekarang.)

## Lifecycle blob URL
- Saat preview dibuka dan blob berhasil didapat:
  - `URL.createObjectURL(blob)` → simpan ke `previewBlobUrl`
- Saat modal ditutup atau target preview berubah:
  - `URL.revokeObjectURL(previewBlobUrl)`
- Tujuan: mencegah memory leak dari object URL.

## Tidak ada perubahan OAuth scope
- Scope saat ini read-only sudah cukup untuk preview berbasis download/proxy.
- Tidak menambah endpoint baru.
- Tidak menambah permission/ubah OAuth.


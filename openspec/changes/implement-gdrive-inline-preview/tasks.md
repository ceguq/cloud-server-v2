## Tasks (frontend-only OpenSpec)

- [x] Audit `frontend/src/app/pages/GDrive.tsx` action menu (`⋯`) dan handler existing: Open / Details / Download/Export / Copy link. (Preview ditambahkan secara read-only, tidak mengubah aksi lain.)
- [x] Review `frontend/src/services/gdriveService.ts` untuk memastikan tersedia helper blob reuse:
  - `getGDriveFileBlob(accountId, fileId)`
- [x] Tambahkan aturan **eligible preview** berdasarkan `mime` (Guard explicit untuk `application/vnd.google-apps.*`/Workspace tidak previewable; eligible: image/*, application/pdf, video/*, audio/*).
- [x] Tambahkan state modal preview di `GDrive.tsx`:
  - `previewFile`, `previewUrl` (object URL), `previewContentType`, `previewLoading`, `previewError`.
- [x] Tambahkan tombol/menu **Preview** pada dropdown `⋯` hanya untuk file yang eligible.
- [x] Implement handler Preview:
  - pakai `getGDriveFileBlob(accountId, fileId)` untuk mengambil blob.
  - buat object URL dengan `URL.createObjectURL(blob)`.
  - gunakan `file.accountId` (tanpa fallback ke `activeAccountId`).
- [x] Render inline preview untuk eligible jenis:
  - image/*: `<img>`
  - application/pdf: `<iframe>`
  - video/*: `<video controls>`
  - audio/*: `<audio controls>`
- [x] Cleanup object URL saat modal ditutup:
  - `URL.revokeObjectURL(previewUrl)` (close modal + unmount).
- [x] Fallback:
  - Google Workspace/unsupported file → tidak menampilkan Preview; pesan fallback di modal jika konten tidak dapat di-preview.
  - Aksi Open dan Download tetap tersedia.
- [x] Pastikan tidak ada perubahan yang dilarang:
  - upload, trash management, restore, disconnect/connect (tetap ada & tidak diubah)
  - route/backend/service/controller (tidak disentuh)
  - OAuth scope (tidak disentuh)

Catatan:
"Implemented initial frontend-only inline preview in frontend/src/app/pages/GDrive.tsx. Text/json/csv/md preview is intentionally deferred."



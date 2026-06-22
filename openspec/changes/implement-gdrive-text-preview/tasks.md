## Tasks (OpenSpec - frontend only)

- [x] Audit `frontend/src/app/pages/GDrive.tsx` preview state dan handler existing:
  - pastikan ada `previewFile`, `previewUrl`, `previewContentType`, `previewLoading`, `previewError`.
- [x] Audit cara `handlePreviewFile` memanggil `getGDriveFileBlob` dan pastikan penggunaan `accountId` mengikuti `file.accountId`.
- [x] Audit `isGDrivePreviewable(file)`/helper eligibility yang ada untuk memastikan text belum termasuk.
- [x] Tambahkan helper deteksi text previewable berdasarkan:
  - `mime` (`text/*`, `application/json`, `text/csv`)
  - fallback extension (`.md`, `.txt`, `.json`, `.csv`, `.log`).
  - workspace (`application/vnd.google-apps.*`) tetap non-eligible.
- [x] Tentukan batas ukuran text preview (contoh: **1 MB**).
- [x] Tambahkan state yang diperlukan untuk text content jika belum ada (opsional):
  - `previewTextContent` / `previewText`.
- [x] Implement handler saat preview file text:
  - ambil blob via `getGDriveFileBlob(file.accountId, file.id)`
  - cek ukuran vs limit
  - baca `blob.text()`
  - set content state
- [x] Render text dalam modal preview read-only:
  - `<pre>` dengan `whiteSpace: pre-wrap` dan `overflow: auto`.
- [x] Pastikan preview untuk binary tipe existing (image/PDF/video/audio) tidak berubah.
- [x] Pastikan file Workspace (`application/vnd.google-apps.*`) tidak dipreview via blob mentah, tetap fallback pesan “Open in Google Drive”.
- [x] Manual test di browser untuk file `.md`, `.txt`, `.json`, `.csv`:
  - preview muncul
  - error/limit behavior benar
  - konten tampil sebagai teks tanpa HTML injection.

> Implementation and read-only audit passed. 
> 
> - Manual browser testing passed after backend media download fix. The metadata JSON preview bug was resolved by sending alt=media as explicit query parameter in GoogleDriveService.php.
> - Manual browser test preview `.md`/`.txt`/`.json`/`.csv` completed successfully.



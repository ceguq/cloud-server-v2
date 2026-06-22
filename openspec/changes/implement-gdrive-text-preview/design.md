## Design overview
Perluasan dari feature inline preview yang sudah ada di halaman **frontend/src/app/pages/GDrive.tsx**.

Implementasi text preview dilakukan pada modal preview yang sudah ada (Preview di dropdown `⋯` → `handlePreviewFile` → render berdasarkan `previewContentType`).

## Reuse yang sudah ada
- Reuse blob download/proxy via:
  - `getGDriveFileBlob(accountId, fileId)` dari `frontend/src/services/gdriveService.ts`.
- Blob text dibaca di frontend menggunakan `blob.text()`.

## Determining previewable text files
Tambahkan helper deteksi “text previewable”:
- Eligible jika:
  - `mime` adalah `application/json`
  - atau `mime` startsWith `text/` (termasuk `text/plain`, `text/markdown`, `text/csv`, `text/xml`, `text/html`, `text/css`, `text/log`, dll.)
  - atau extension fallback (ketika mime kurang informatif):
    - `.md`, `.markdown`, `.txt`, `.json`, `.csv`, `.log`
- Explicit non-eligible:
  - `mime` startsWith `application/vnd.google-apps.` (Workspace) → tampilkan fallback pesan “Open in Google Drive”.

## AccountId correctness
Text preview harus menggunakan `file.accountId` saat memanggil `getGDriveFileBlob(...)`.
- Jangan menggunakan fallback ke `activeAccountId` untuk fetch blob.
- Ini mengikuti aturan existing behavior preview blob.

## Size guard (anti UI berat)
- Tentukan batas aman (contoh awal): **1 MB** (`MAX_TEXT_PREVIEW_BYTES = 1_048_576`).
- Jika `file.sizeBytes` tidak tersedia:
  - lakukan defensif dengan tetap membatasi bytes yang akan diproses (opsional: tampilkan fallback bila ukuran tidak bisa dipastikan).
- Jika blob melebihi batas:
  - set error state preview yang user-friendly:
    - “File terlalu besar untuk preview. Silakan Download/Open.”
  - pastikan dropdown/aksi lain tidak berubah.

## Rendering
Ketika eligible dan blob diambil:
- baca content: `const content = await blob.text()`
- render di modal dalam `<pre>`:
  - `whiteSpace: "pre-wrap"`
  - `overflow: "auto"`
  - batasi tinggi container (mis. max-height seukuran modal) agar tidak mengganggu layout.

Contoh konsepsi:
- `<pre>{content}</pre>` dengan wrapper yang bisa scroll.

## Error handling & safety
- Jika error fetch blob atau error saat baca `.text()`:
  - tampilkan pesan aman seperti “Failed to load preview.” atau “Preview not available.”
- Jangan memunculkan HTML injection:
  - render sebagai teks di `<pre>` (bukan `dangerouslySetInnerHTML`).

## Tidak mengubah hal-hal dilarang
- Tidak mengubah dropdown positioning/click-outside/Escape.
- Tidak mengubah upload dan trash/restore/delete permanent.
- Tidak mengubah backend/controller/service/routes.


## Problem
NimbusDrive V2 (halaman Google Drive / GDrive) saat ini mengharuskan user untuk membuka/redirect ke Google Drive untuk melihat isi file tertentu. Alur ini kurang cepat dan kurang “in-place”, terutama ketika user hanya ingin preview cepat.

## Goal
Menambahkan **inline preview** di halaman GDrive (tanpa redirect) untuk tipe file yang didukung, sehingga user bisa melihat konten langsung dari NimbusDrive.

## Non-goals
- Mengubah backend/API/endpoints, OAuth, atau menambah scope (tetap read-only).
- Mengubah logic connect/list accounts, list file per akun, atau struktur data kolom Type yang sudah ada.
- Tidak ada write action (tidak ada upload/rename/move/create/share/delete/trash).
- Tidak mengubah behavior existing actions: Open / Details / Download/Export / Copy link.

## Scope
Frontend-only pertama kali.

Preview inline untuk file yang bisa dibaca dari **blob** hasil existing download/export proxy.

Tipe preview yang direncanakan:
1. **Image**: image/jpeg, image/png, image/gif, image/webp, image/svg+xml
2. **PDF**: application/pdf
3. **Video**: video/mp4, video/webm, video/quicktime (jika browser support)
4. **Audio**: audio/mpeg, audio/wav, audio/ogg, audio/mp4
5. **Text/code kecil**:
   - text/plain
   - text/csv
   - text/markdown
   - application/json
   - application/xml
   - text/html
   - text/css
   - application/javascript
6. **Google Workspace files**:
   - Google Docs: preview sebagai PDF via export/download proxy (jika backend mengembalikan PDF)
   - Google Sheets: fallback (download/open / tindakan yang ada) jika XLSX tidak cocok untuk inline preview
   - Google Slides: preview sebagai PDF via export/download proxy
   - Google Drawing: preview sebagai PNG via export/download proxy
7. **Unsupported**:
   - tampilkan pesan **“Preview not available”**
   - tetap sediakan tombol **Open** dan **Download/Export**.

## Acceptance criteria
1. Di halaman GDrive, tiap file yang didukung memiliki aksi **Preview** di dropdown `⋯`.
2. Saat user klik Preview:
   - UI menampilkan preview inline sesuai tipe (image/PDF/video/audio/text) dan untuk Workspace file menggunakan export/download proxy.
   - Untuk unsupported file: tampil pesan “Preview not available” dan tidak menutup akses ke Open & Download/Export.
3. Lifecycle blob URL aman:
   - object URL dibuat saat preview dibutuhkan
   - object URL direvoke saat modal ditutup
4. Open/Details/Download/Copy tetap berfungsi seperti sebelumnya (tidak berubah).
5. Tidak ada perubahan backend/API/OAuth scope.
6. Test build manual (oleh user) berjalan tanpa error UI dan preview berfungsi untuk tipe yang didukung.


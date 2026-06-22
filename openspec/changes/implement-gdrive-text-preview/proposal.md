## Problem
NimbusDrive V2 (halaman Google Drive / GDrive) saat ini menyediakan inline preview untuk beberapa tipe file (image/PDF/video/audio), tetapi file teks (mis. `.md`, `.txt`, `.json`, `.csv`) belum diprioritaskan untuk ditampilkan langsung di modal preview.

## Goal
Menambahkan **inline text preview read-only** di halaman GDrive untuk file teks berbasis blob yang sudah ada, sehingga user dapat membaca isi file tanpa edit/redirect.

## Non-goals
- Tidak mengubah isi file (preview hanya read-only).
- Tidak menambah syntax highlighting kompleks.
- Tidak preview Google Docs/Sheets/Slides workspace (Google Workspace file via `application/vnd.google-apps.*`).
- Tidak mengubah proses upload.
- Tidak mengubah trash/restore/delete permanent.
- Tidak mengubah perilaku: **Open**, **Details**, **Download/Export**, **Copy link**.
- Tidak implementasi large-file streaming.

## Scope
- Preview read-only untuk tipe yang aman:
  - `text/plain`
  - `text/markdown` dan varian extension `.md` / `.markdown`
  - `application/json`
  - `text/csv`
  - `text/*` lain yang aman (mis. `text/xml`, `text/html`, `text/css`, `text/log`)
- Deteksi eligible berdasarkan:
  - `mime` (prefix `text/` dan `application/json`, `text/csv`)
  - serta fallback extension (`.md`, `.txt`, `.json`, `.csv`, `.log`) jika mime kurang jelas.
- Pembatasan ukuran untuk mencegah UI berat.
- Jika terlalu besar atau tidak eligible:
  - tampilkan pesan user-friendly bahwa preview tidak tersedia.
  - arahkan user ke aksi **Download/Open** yang sudah ada.
- Google Workspace (`application/vnd.google-apps.*`) tetap tidak dipreview via blob mentah.


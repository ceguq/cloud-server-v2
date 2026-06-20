# Design: GDrive Type Column

## Overview
Tambahkan kolom/area **Type** di halaman GDrive (row file/folder). Kolom ini menampilkan jenis item secara ramah manusia beserta detail kecil.

## Data source
Menggunakan metadata file yang sudah tersedia dari struktur file UI:
- `mime` (berasal dari `mime_type`)
- `name` (berasal dari `name`)

Catatan:
- Untuk Workspace file (Docs/Sheets/Slides/Drawing), biasanya `mime` mengandung pola `application/vnd.google-apps.*`.
- Untuk file non-Workspace, extension dapat diekstrak dari `name` (mis. `.pdf`, `.jpg`, `.mp4`, `.zip`, `.txt`, dll.).

## Mapping type
Mapping menggunakan kombinasi berikut (prioritas tertinggi di workspace mime):

### 1) Workspace Google (`mime`)
- Jika `mime` == `application/vnd.google-apps.document` → **Google Docs**
- Jika `mime` == `application/vnd.google-apps.spreadsheet` → **Google Sheets**
- Jika `mime` == `application/vnd.google-apps.presentation` → **Google Slides**
- Jika `mime` == `application/vnd.google-apps.drawing` → **Google Drawing**

Detail kecil (contoh):
- `Workspace file`
- MIME pendek (mis. `Docs`, `Sheets`, dll) atau salah satu ringkasan dari mime penuh.

### 2) Folder
- Jika item berasal dari folder (di UI sekarang terlihat dari `mime` mengandung kata `folder`) → **Folder**

Detail kecil (contoh):
- `Folder`

### 3) MIME-based kategori
Gunakan deteksi sederhana berbasis substring pada `mime` (yang sudah berjalan pada UI ikon saat ini):
- `image` → **Image**
- `video` → **Video**
- `audio` → **Audio**
- `pdf` → **PDF**
- `zip`/`compressed`/`tar` → **Archive**
- `text` → **Text**

Jika tidak ditemukan dengan aturan di atas, fallback ke kategori extension atau default.

### 4) Extension-based kategori (dari `name`)
Jika `mime` tidak cukup spesifik, gunakan extension:
- `.pdf` → PDF
- `.zip` `.rar` `.7z` `.tar` `.gz` → Archive
- `.txt` `.md` `.csv` `.log` → Text
- `.png` `.jpg` `.jpeg` `.gif` `.webp` → Image
- `.mp4` `.mov` `.mkv` `.webm` → Video
- `.mp3` `.wav` `.ogg` → Audio

### 5) Default
- Jika tidak cocok dengan semua mapping → **File**

## UI placement (penempatan kolom/area)
- Tambahkan kolom/area **Type** di row file.
- Kolom Type menempati area grid yang sudah ada/akan disesuaikan.
- Setiap row menampilkan:
  1. Label utama (teks berukuran kecil namun jelas)
  2. Detail kecil (teks lebih kecil, lebih redup)

## Workspace badge relocation
Badge “Workspace file” yang saat ini berdekatan dengan nama file akan dipindahkan ke area Type:
- Di area Type tampilkan label workspace (mis. Google Docs)
- Detail kecil bisa memuat `Workspace file` atau ringkasan MIME.

Tujuan:
- Nama file menjadi lebih lega.
- Kolom Type menjadi sumber utama informasi jenis file.

## Responsive considerations
- Kolom Type tidak boleh menyebabkan horizontal overflow yang berlebihan.
- Gunakan layout grid dengan width yang terukur.
- Pastikan teks detail kecil truncate bila dibutuhkan.

## Non-backend requirement
- Tidak ada perubahan API.
- Tidak ada perubahan endpoint.
- Tidak ada perubahan OAuth.
- Pure frontend change untuk rendering Type.


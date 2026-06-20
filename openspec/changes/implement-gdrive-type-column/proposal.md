# Proposal: GDrive Type Column (Human-readable)

## Problem
Di halaman NimbusDrive V2 (GDrive), pengguna melihat daftar file dengan informasi seperti nama, visibility, modified, dan size. Namun jenis file (mis. Google Docs/Sheets/Slides, Folder, Image, PDF, dll.) tidak disajikan dalam format yang mudah dipahami.

Akibatnya pengguna perlu membuka file atau menebak dari label MIME/extension yang tidak selalu tersedia/terlihat jelas.

## Goal
Menambahkan area/kolom **Type** pada setiap row file/folder di halaman GDrive agar setiap item menampilkan jenisnya secara **ramah manusia**, termasuk:
- Label utama (mis. Google Docs, Image, PDF, Folder)
- Detail kecil (mis. Workspace file / MIME pendek / extension file)

## Non-goals
- Mengubah logic backend, API, OAuth, atau request/endpoint terkait data GDrive.
- Mengubah mekanisme connect/list accounts dan fetch file per akun.
- Mengubah behavior download/export.
- Mengubah action dropdown (titik tiga `⋯`).
- Mengaktifkan Trash (tetap Coming soon/disabled).

## Scope
Frontend-only untuk implementasi kolom Type pada halaman GDrive:
- Menambah kolom/area Type di row file.
- Menggunakan metadata file yang sudah tersedia (terutama `mime_type`/`mime` dan `name`).
- Mapping type dari `mimeType` dan/atau extension.
- Memindahkan badge “Workspace file” yang saat ini berada dekat nama file ke area Type.
- Penyesuaian layout grid agar tetap responsif dan aman.

### Type yang didukung
- Google Docs
- Google Sheets
- Google Slides
- Google Drawing
- Folder
- Image
- Video
- Audio
- PDF
- Archive
- Text
- File (default)

## Acceptance criteria
1. Setiap row file/folder menampilkan label Type yang ramah manusia sesuai metadata.
2. Area Type menampilkan:
   - Label utama (contoh: Google Docs, Image, PDF, Folder)
   - Detail kecil (contoh: Workspace file / MIME pendek / extension).
3. Badge Workspace yang ada dekat nama file dipindahkan ke area Type (agar nama file lebih lega).
4. Action dropdown `⋯` tetap berfungsi dan tidak berubah posisinya.
5. Layout tetap responsif: tidak memotong kolom penting pada berbagai ukuran layar.
6. Tidak ada perubahan backend/API/OAuth.


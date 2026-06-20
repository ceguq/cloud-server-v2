# OpenSpec: Implement Google Drive Workspace Export (NimbusDrive)

## Problem
Saat ini menu **GDrive** sudah bisa:
- list akun
- list file per akun
- open link
- copy link
- tampilkan metadata (modal details)
- **download binary file** via backend proxy

Namun **Google Docs / Sheets / Slides / Drawings (Google Workspace files)** tidak bisa diunduh menggunakan mekanisme download binary biasa (mis. `alt=media`). File Workspace membutuhkan **export** ke format yang sesuai (PDF/DOCX/XLSX/PPTX/PNG), bukan download media mentah.

Akibatnya, tombol **Download** akan gagal untuk file bertipe `application/vnd.google-apps.*`.

## Goal
Tambahkan rencana fitur **download/export** untuk file Google Workspace dengan tetap berada pada mode **read-only**.

Hasil ekspor yang diharapkan:
- **Google Docs** → export ke **PDF** atau **DOCX**.
- **Google Sheets** → export ke **XLSX** atau **PDF**.
- **Google Slides** → export ke **PDF** atau **PPTX**.
- **Google Drawings** → export ke **PNG** atau **PDF** (jika didukung/semudah Docs/Slides dalam Drive API).

## Non-goals
- Tidak melakukan **upload**.
- Tidak melakukan **rename**.
- Tidak melakukan **delete/trash**.
- Tidak melakukan **move**.
- Tidak melakukan **share/permission**.
- Tidak mengubah **OAuth scope write** (read-only tetap).

## Scope (Read-only)
- Endpoint backend download yang sudah ada tetap dipakai:
  - `GET /api/gdrive/accounts/{account}/files/{fileId}/download`
- Backend akan mendeteksi `mime_type` file:
  - Jika itu Google Workspace mime type → melakukan **export** via Google Drive API.
  - Jika itu binary file biasa → tetap gunakan `alt=media` (download biasa), tanpa perubahan behavior.

## Proposal keputusan export default
Karena UI saat ini hanya menyediakan satu aksi tombol **Download**, maka export format harus punya default deterministic.

Rekomendasi default (tanpa menambah UI baru):
- Docs (`document`) → **PDF**
- Sheets (`spreadsheet`) → **XLSX** (fallback ke PDF jika tidak didukung)
- Slides (`presentation`) → **PDF**
- Drawings (`drawing`) → **PNG** (fallback ke PDF bila diperlukan)

## Output/error behavior (read-only)
- Jika export gagal, backend mengembalikan respon error yang **aman** (tanpa token/secret).
- Frontend tetap menampilkan error umum (sesuai mekanisme alert/error handling yang sudah ada), tanpa memperluas logic UI.


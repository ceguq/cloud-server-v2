## Problem
NimbusDrive V2 (halaman Google Drive / GDrive) saat ini mengharuskan user untuk membuka/redirect ke Google Drive untuk melihat isi file tertentu. Alur ini kurang cepat dan kurang “in-place”, terutama ketika user hanya ingin preview cepat.

## Goal
Menambahkan **inline preview** di halaman GDrive (tanpa redirect) untuk file yang bisa dipreviewable: **image, PDF, video, audio, dan text sederhana** (bila aman).

## Non-goals
- Mengubah backend/API/routes/controller/service.
- Tidak mengubah OAuth scope atau mekanisme auth (scope tetap read-only).
- Tidak menambah fitur upload/modify/trash dari sisi preview (preview hanya read).
- Tidak melakukan cross-account transfer.
- Tidak melakukan workspace export yang kompleks selain memanfaatkan proxy/download yang sudah ada.
- Tidak mengubah behavior existing actions: **Open**, **Details**, **Download/Export**, **Copy link**.

## Scope awal
**Frontend-only** pertama kali.

Preview modal memanfaatkan blob dari endpoint download/proxy yang sudah ada di frontend service:
- `getGDriveFileBlob(accountId, fileId)` (reuse)

## Tipe preview yang direncanakan (minimal)
1. **image/** → `<img>`
2. **application/pdf** → `<iframe>` atau `<object>`
3. **video/** → `<video controls>`
4. **audio/** → `<audio controls>`
5. **text/** dan varian yang aman → render text view (limit ukuran)
   - mis. `text/plain`, `text/csv`, `text/markdown`, `application/json`, `application/xml`, `text/html`, `text/css`, `md/json/csv` yang umum

## Fallback
- File **Google Workspace** (Docs/Sheets/Slides/Drawing) dan/atau file yang **unsupported**:
  - tampilkan fallback **“Open in Google Drive”** (untuk file workspace) atau **“Preview not available”** (untuk unsupported)
  - tetap sediakan aksi **Open** dan **Download/Export** yang sudah ada.


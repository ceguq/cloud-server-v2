# implement-gdrive-preview-parity-my-files

## Problem
Preview modal di GDrive saat ini berbeda dari Preview modal di My Files. GDrive preview masih relatif sederhana, sedangkan My Files memiliki UX lebih lengkap seperti:
- header tools
- tombol Download di header preview
- minimize/maximize
- zoom image
- body preview yang lebih responsif serta penanganan loading/error/fallback yang lebih kaya

## Goal
Menyamakan UX Preview GDrive dengan Preview My Files sejauh memungkinkan secara frontend.

## Non-goal
- Tidak mengubah backend Google Drive.
- Tidak mengubah logic/endpoint di `frontend/src/services/gdriveService.ts` (blob/download logic tetap memakai existing flow).
- Tidak mengubah action menu/right-click/grid/list toolbar.
- Tidak mengubah logic upload/trash/restore/delete permanent.

## Scope
- Frontend-only di `frontend/src/app/pages/GDrive.tsx`.
- Referensi UI/behavior dari `frontend/src/app/pages/MyFiles.tsx`.

## Design constraints (wajib dipatuhi)
- GDrive preview tetap memakai logic preview existing:
  - `getGDriveFileBlob(accountId, file.id)`
  - `previewUrl`
  - `previewContentType`
  - `previewTextContent`
  - `previewLoading`
  - `previewError`
  - cleanup object URL tetap aman (revoke ketika close dan saat mengganti file preview).
- Tidak mengubah rules yang sudah ada untuk apakah file bisa preview:
  - folder tetap tidak previewable
  - file biasa tetap previewable sesuai helper existing.
- Implementasi harus step kecil dan tidak rewrite seluruh modal preview sekaligus.
- Jangan merusak grid/list/right-click/action menu behavior maupun separation key/id (`rowKey` vs `id`).

## Risk
- `GDrive.tsx` adalah file besar: perubahan UI modal harus bertahap.
- Risiko utama adalah race condition preview request (harus tetap menjaga invalidasi request).
- Risiko object URL cleanup: jangan mengubah logic yang sudah benar tanpa kebutuhan.
- Pastikan tidak ada perubahan pada toolbar/menu/row interaction yang bisa menimbulkan regresi.

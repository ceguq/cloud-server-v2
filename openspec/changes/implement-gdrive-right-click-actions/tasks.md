# OpenSpec Tasks: implement-gdrive-right-click-actions

## Checklist

- [x] Audit existing action menu state and positioning.
  - [x] Pastikan `openActionFileId`, `actionMenuRef`, `actionMenuPosition`, `closeActionMenu()` dipakai konsisten.
  - [x] Pastikan event listeners untuk click-outside / Escape / scroll / wheel masih berjalan.

- [x] Audit existing `renderFileActions(file)`
  - [x] Pastikan action availability rules berjalan (folder tidak punya Preview/Download, trash mode hanya Restore/Delete Permanently).
  - [x] Pastikan tidak ada perubahan fitur yang sudah berhasil.

- [x] Add context menu handler in `frontend/src/app/pages/GDrive.tsx`.
  - [x] Implement `handleFileContextMenu(event, file)`.
  - [x] Wajib: `event.preventDefault()`.
  - [x] Wajib: set `openActionFileId` ke `file.rowKey`.
  - [x] Wajib: set `actionMenuPosition` memakai `event.clientX/event.clientY`.
  - [x] Wajib: clamp agar menu tidak keluar viewport.
  - [x] Right-click tidak mengirim API request.

- [x] Attach `onContextMenu` to GDrive row/card containers for folder and file sections.
  - [x] Pasang pada container item Folder.
  - [x] Pasang pada container item Regular Files.

- [x] Reuse existing `renderFileActions(file)`.
  - [x] Pastikan menu content tidak berubah.

- [x] Use `file.rowKey` for UI open action state.
  - [x] Pastikan `openActionFileId` memakai `file.rowKey` (bukan `file.id`).

- [x] Use mouse coordinates for right-click dropdown positioning.
  - [x] Top/Left berasal dari `event.clientX/clientY`.

- [x] Preserve ⋯ button behavior.
  - [x] Tidak mengubah positioning/click logic tombol ⋯.

- [x] Preserve click-outside and Escape behavior.
  - [x] Tidak mengubah implementasi listener yang sudah ada.

- [x] Verify folder actions still hide Preview/Download.
  - [x] Right-click folder harus menampilkan action sesuai logic existing.

- [x] Read-only audit after implementation.
  - [x] Pastikan tidak ada perubahan backend/service/route.
  - [x] Pastikan tidak ada perubahan preview modal.
  - [x] Pastikan tidak ada perubahan fitur yang sudah berhasil.

## Manual browser test

- [x] Right-click file opens action dropdown
- [x] Right-click folder opens action dropdown
- [x] ⋯ button still opens action dropdown
- [x] Click outside closes dropdown
- [x] Escape closes dropdown
- [x] File actions still work
- [x] Folder does not show Preview/Download

## Notes
- Manual browser testing passed.



# Design: Separate Google Drive folders and files in GDrive UI

## Overview
Pisahkan rendering item GDrive menjadi 2 bagian (section) berdasarkan tipe item (folder vs regular file), tanpa mengubah backend/service atau logika aksi yang sudah ada.

## Data source
- Tetap memakai `filteredFiles` (hasil dari list existing + tab + search).
- Tidak mengubah cara fetch/list.

## Helper
Tambahkan helper di `frontend/src/app/pages/GDrive.tsx`:

- `isGDriveFolder(file)` berdasarkan:
  - `file.mime === "application/vnd.google-apps.folder"`

## Split arrays
- `folderItems = filteredFiles.filter(isGDriveFolder)`
- `regularFileItems = filteredFiles.filter((file) => !isGDriveFolder(file))`

## Rendering strategy
- Render section **Folders** untuk `folderItems`.
- Render section **Files** untuk `regularFileItems`.
- Pastikan folder dan file tidak dirender di dalam table/list section yang sama.

## UI behavior / empty state
- Jika `folderItems` kosong:
  - section folder boleh empty/hidden sesuai style existing.
- Jika `regularFileItems` kosong:
  - tampilkan empty state untuk files (mengikuti empty state yang sudah ada pada component).

## Action & behavior rules (non-breaking)
- Jangan ubah preview modal.
- Jangan ubah action menu positioning (fixed menu) dan event handling (click-outside / Escape).
- Jangan ubah logic `rowKey` vs `id`.
- Jangan kirim `rowKey` ke API.

### Folder
- Preview: tetap tidak muncul (menu item Preview harus tidak render/disabled sesuai existing logic).
- Download: harus disembunyikan untuk folder.
- Open/Details/Copy link: tetap ada jika valid/tersedia pada existing logic.
- Trash/Restore/Delete Permanently: tetap mengikuti existing Google Drive API action jika `file.id` valid.

### Regular files
- Action menu dan perilaku harus tetap sama dengan implementasi existing.

## Risk notes
- Pastikan `rowKey` tetap dipakai sebagai key React dan untuk state tracking action menu.
- Pastikan `file.id` tetap digunakan untuk API actions.
- Hindari perubahan markup yang dapat merusak click handling (menu, click menu toggle, click-outside, Escape).


# OpenSpec Proposal: implement-gdrive-right-click-actions

## Problem
Saat ini action menu GDrive hanya bisa dibuka dari tombol titik tiga (⋯). User ingin file/folder juga bisa klik kanan untuk membuka dropdown action yang sama.

## Goal
Menambahkan right-click/context menu pada row/card file/folder GDrive agar membuka action dropdown yang sama seperti tombol ⋯.

## Non-goal
- Tidak membuat browser native context menu custom global.
- Tidak mengubah backend/service.
- Tidak mengubah aksi upload/preview/download/trash/restore/delete permanent.
- Tidak mengubah preview modal.
- Tidak membuat nested folder navigation.

## Scope
- Frontend-only di `frontend/src/app/pages/GDrive.tsx`.

## Constraints / Preserve existing behavior
- Reuse action menu existing: `renderFileActions(file)`.
- Dropdown tetap menggunakan:
  - `rowKey` untuk UI state
  - `file.id` untuk API/action execution
  - click-outside
  - Escape closeActionMenu
  - `actionMenuRef`
  - dropdown `position: fixed`
- Tombol ⋯ tetap memakai positioning existing dari `getBoundingClientRect()`.
- Right-click hanya membuka menu (tidak mengirim API request langsung).
- File/folder action rules tetap mengikuti logic existing:
  - folder tidak punya Preview/Download
  - file biasa tetap punya Preview/Download
  - trash mode tetap Restore/Delete Permanently

## Proposed UX behavior
- Right-click pada row/card file/folder:
  - `event.preventDefault()`
  - buka dropdown action untuk item yang di-click
  - posisi dropdown pakai koordinat mouse (fixed-position menu)
  - tetap clamp agar tidak keluar viewport (menggunakan logic positioning existing secara minimal atau clamp lokal)
- Klik kanan pada button/link di dalam row/card:
  - tidak boleh men-trigger menu (hindari bentrok dengan elemen kontrol yang sudah ada)

## Risks / Edge cases
- Jangan bentrok dengan tombol ⋯ (menu tidak ganda).
- Jangan trigger action saat klik kanan pada button/link (mis. ⋯ tombol, area input, dll).
- Jangan merusak selection/open/details/preview modal.

## Success criteria
- Right-click file → dropdown sama seperti tombol ⋯.
- Right-click folder → dropdown sama seperti tombol ⋯ (tanpa Preview/Download).
- Tombol ⋯ tetap berfungsi sama seperti sebelum perubahan.
- click-outside dan Escape tetap menutup dropdown.


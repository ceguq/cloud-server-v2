# OpenSpec Proposal: fix-gdrive-trash-dropdown-actions

## Ringkasan
Di halaman **GDrive** saat mode **Trash**, dropdown aksi file masih menampilkan action normal (mis. Preview/Open/Details/Download/Copy/Trash) yang seharusnya tidak tampil/ter-trigger pada mode Trash.

## Problem
Dropdown action tidak membedakan konteks **Files vs Trash** secara penuh.

## Goal
Saat `driveListMode === "trash"`, dropdown hanya menampilkan action yang relevan untuk item trash (terutama **Restore** dan **Delete Permanently** bila handler sudah tersedia).

## Non-goals
- Tidak ubah backend
- Tidak ubah route/service
- Tidak ubah Google Drive upload
- Tidak ubah preview modal
- Tidak ubah layout row/header/actions column
- Tidak ubah positioning/click-outside/Escape dropdown

## Scope
- Conditional rendering di `renderFileActions(file)` pada `frontend/src/app/pages/GDrive.tsx`.
- (Target implementasi) action normal (Preview/Open/Details/Download/Copy link/Move to trash) **tidak ditampilkan** pada mode Trash.


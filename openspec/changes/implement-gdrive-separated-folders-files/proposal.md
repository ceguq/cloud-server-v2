# Proposal: Separate Google Drive folders and files in GDrive UI

## Problem
Saat ini halaman GDrive merender Google Drive folder dan file dalam satu list/table yang sama, sehingga folder dan file terasa bercampur.

## Goal
Memisahkan tampilan folder dan file di halaman GDrive.

## Non-goal
- Tidak membuat nested folder navigation.
- Tidak membuat endpoint backend baru.
- Tidak mengubah upload/download/preview/trash/restore/delete permanen yang sudah selesai.

## Scope
- Frontend-only separation di `frontend/src/app/pages/GDrive.tsx`.
- Data tetap dari fetch/list existing.

## UX / Requirements
- Render section **“Folders”** untuk item mime `application/vnd.google-apps.folder`.
- Render section **“Files”** untuk item selain folder.
- Folder dan file tidak dirender dalam satu table/list section yang sama.
- Jika tidak ada folder, section folder boleh empty/hidden sesuai style existing.
- Jika tidak ada file, tampilkan empty state untuk files.

## Notes / Constraints
- Tidak membuat perubahan backend.
- Tidak membuat perubahan service.
- Tidak mengubah preview modal.

## Action rules
### Folder (`application/vnd.google-apps.folder`)
- Open boleh tetap ada jika existing open link tersedia.
- Details boleh tetap ada.
- Copy link boleh tetap ada.
- Trash/Restore/Delete Permanently boleh tetap mengikuti existing Google Drive API action jika file id valid.
- Preview harus tetap tidak muncul.
- Download harus disembunyikan untuk folder.

### File (selain folder)
- Action existing tetap sama.

## Risk / Compatibility
- Jangan merusak `rowKey` vs `id`.
- Jangan mengirim `rowKey` ke API.
- Jangan mengubah action menu positioning/click-outside/Escape.
- Jangan mengubah upload/preview/download/trash/restore/permanent delete logic.


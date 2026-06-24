# Tasks: Separate Google Drive folders and files in GDrive UI

## Checklist
- [x] Audit current GDrive folder/file rendering.
- [x] Add folder detection helper in `frontend/src/app/pages/GDrive.tsx`.
- [x] Split filtered items into folders and files.
- [x] Render “Folders” section separately from “Files” section.
- [x] Hide Download action for folders.
- [x] Keep Preview hidden for folders.
- [x] Keep file actions unchanged for regular files.
- [x] Preserve rowKey/id separation.
- [x] Read-only audit after implementation.
- [x] Manual browser test:
  - [x] folder appears in Folders section
  - [x] regular files appear in Files section
  - [x] folder does not show Preview/Download
  - [x] regular files still preview/download/upload/trash correctly

## Notes
- Jangan ubah backend/service.
- Jangan ubah preview modal.
- Jangan ubah upload/preview/download/trash/restore/permanent delete logic selain kebutuhan hiding action untuk folder sesuai rules.

## Notes (Update)
- Manual browser testing passed.



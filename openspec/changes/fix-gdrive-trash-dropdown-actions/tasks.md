# OpenSpec Tasks: fix-gdrive-trash-dropdown-actions

- [x] Audit `renderFileActions(file)` di `GDrive.tsx`.
- [x] Identifikasi action yang muncul di mode **Files**.
- [x] Identifikasi action yang muncul di mode **Trash**.
- [x] Pastikan handler **Restore** sudah ada (mis. `handleRestoreFile`).
- [x] Pastikan apakah handler **Delete Permanently / Hapus permanen** sudah ada atau belum. (Belum ada)
- [x] Implement conditional rendering supaya mode **Trash** hanya menampilkan action trash yang relevan.
- [x] Pastikan mode **Files** tetap menampilkan action normal.
- [x] Pastikan dropdown positioning/click-outside/Escape tidak berubah.
- [x] Pastikan layout row/header/actions column tidak berubah.

Catatan: Trash dropdown action filtering implemented. In Trash mode, only Restore is shown because Delete Permanently handler is not implemented yet.


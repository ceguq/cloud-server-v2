## Tasks: GDrive Upload MVP

- [x] Audit current Google Drive OAuth scope dan GoogleDriveService.
- [ ] Tentukan scope minimal yang aman untuk upload.
- [x] Tambah backend endpoint upload Google Drive account.
- [x] Tambah method upload di GoogleDriveService.
- [x] Tambah frontend service uploadGDriveFile(accountId, file).
- [x] Tambah tombol upload kecil di GDrive.tsx untuk active account.
- [x] Tambah loading/error/success state.
- [x] Refresh file list setelah upload sukses.
- [x] Pastikan fitur lama connect/list/preview/download/trash/restore/disconnect tidak rusak.
- [x] Jangan implement smart router/cross-account transfer/drag-drop dashboard dulu.

- [x] Manual browser test upload PDF/image/video/.md.

Note: "Manual browser testing passed for PDF, image, video, and .md uploads. The earlier google_status 400 issue was resolved after the multipart/related upload request patch." 

Current configured scope works for upload in manual testing; least-privilege scope decision remains future work.




# Tasks: implement-gdrive-grid-list-view

## Checklist
- [ ] Audit current `GDrive` list rendering dan action menu (folders & files).
- [ ] Add `viewMode` state di `frontend/src/app/pages/GDrive.tsx`.
- [ ] Add toggle UI **List/Grid** di toolbar/header halaman GDrive.
- [ ] Preserve existing list rendering ketika `viewMode === "list"`.
- [ ] Add grid card rendering untuk `folderItems`.
- [ ] Add grid card rendering untuk `regularFileItems`.
- [ ] Keep section **“Folders”** dan **“Files”** tetap terpisah pada kedua mode.
- [ ] Reuse `renderFileActions(file)` pada grid cards.
- [ ] Preserve right-click dropdown pada grid cards.
- [ ] Preserve behavior tombol **⋯** pada grid cards.
- [ ] Preserve pemisahan `rowKey` (UI) vs `id` (API) untuk action.
- [ ] Keep folder Preview/Download tetap hidden (sesuai behavior existing).
- [ ] Read-only audit setelah implementasi.

## Manual browser test
- [ ] List mode: renders folders/files terpisah.
- [ ] Grid mode: renders folders/files terpisah.
- [ ] Toggle List/Grid berfungsi.
- [ ] Right-click berfungsi pada kedua mode.
- [ ] Tombol **⋯** berfungsi pada kedua mode.
- [ ] Folder tidak menampilkan Preview/Download.
- [ ] File preview/download/trash masih bekerja.
- [ ] Build sukses.

## After done (report)
- [ ] Laporkan file yang dibuat/diubah.
- [ ] Ringkas perubahan implementasi.
- [ ] Konfirmasi hanya OpenSpec (jika sesuai aturan tim).
- [ ] Konfirmasi tidak menjalankan terminal/command apa pun.


# Tasks: implement-gdrive-preview-parity-my-files

## Checklist
- [x] Audit MyFiles preview modal behavior and reusable UI patterns.
- [x] Audit GDrive preview modal state and rendering.

## Implementation plan (frontend-only)

- [x] Step 1: Align GDrive preview modal layout/header/body style dengan My Files.
- [x] Step 2: Add Download button di header preview GDrive.
- [x] Step 3: Tambahkan maximize/minimize/maximized + minimized behavior.
- [ ] Step 4: Tambahkan image zoom controls jika aman.
- [ ] Step 5: Samakan loading/error/text fallback UI jika memungkinkan tanpa mengubah logic fetch/blob.

Note: Step 1–3 manual browser testing passed (Step 3A: normal/maximized/minimized preview mode, minimized is intentionally non-draggable). Step 4–5 remain pending.



## Preserve constraints (wajib)
- [x] Preserve existing GDrive blob preview logic (`getGDriveFileBlob`).
- [x] Preserve preview object URL cleanup.
- [ ] Preserve grid/list/right-click/action menu behavior.
- [ ] Preserve rowKey/id separation.


## Safety & verification
- [ ] Read-only audit setelah tiap langkah implementasi (konfirmasi tidak ada regresi).
- [ ] Manual browser test:
  - [ ] Preview .md/.txt/.json masih works
  - [ ] Preview image masih works
  - [ ] Preview video masih works
  - [ ] Preview PDF masih works jika tersedia
  - [ ] Download dari preview header works
  - [ ] Close preview cleans up dengan benar
  - [ ] Grid/List dan right-click masih work setelah perubahan preview
  - [ ] Build succeed

## Completion report (setelah selesai)
- [ ] File yang dibuat
- [ ] Ringkasan isi
- [ ] Konfirmasi hanya OpenSpec files yang dibuat
- [ ] Konfirmasi tidak menjalankan terminal/command apa pun

# Design: Preview parity GDrive ↔ My Files

## Overview
GDrive preview akan di-upgrade secara bertahap agar UX dan layout lebih konsisten dengan Preview My Files, tetapi tanpa mengubah backend maupun blob/download logic.

## Keep existing preview logic
Tetap gunakan existing flow dari `GDrive.tsx`:
- Fetch blob via `getGDriveFileBlob(accountId, file.id)`.
- Untuk binary:
  - `previewUrl = URL.createObjectURL(blob)`
  - `previewContentType` ditentukan dari header/contentType/fallback.
- Untuk text:
  - menggunakan `blob.text()` dan limit `TEXT_PREVIEW_MAX_BYTES`.
- Object URL cleanup tetap dijaga:
  - revoke saat preview close
  - revoke saat preview diganti (sebelum membuat object URL baru)
  - cleanup saat unmount.

## Parity steps (bertahap)

### Step 1 — Align layout/header/body style
- Samakan style visual modal secara umum dengan My Files:
  - backdrop/overlay
  - container border/radius/shadow/padding
  - header section (title dan nama file)
  - body panel area (border + background panel)

### Step 2 — Add Download button in preview header
- Tambahkan tombol Download pada header preview GDrive.
- Gunakan logic download yang sudah ada di `GDrive.tsx`.
- Pastikan tombol muncul hanya ketika file previewable (dan file memiliki `accountId` + `id` yang valid).

### Step 3 — Maximize/Minimize mode (jika aman)
- Jika ada pattern yang bisa diadaptasi dengan aman dari My Files:
  - tambahkan state mode (normal/maximized/minimized)
  - samakan behavior close minimization/responsive sizing.
- Jika tidak aman (mis. konflik dengan layout/scroll modal GDrive saat ini), batasi scope hanya sampai Step 2.

### Step 4 — Image zoom controls (jika aman)
- Tambahkan zoom controls untuk image:
  - zoom in / zoom out / reset
- Gunakan pendekatan serupa dengan My Files (scale transform + image sizing).
- Pastikan tidak mengubah behavior preview image dasar yang sudah berfungsi.

### Step 5 — Align loading/error/text fallback UI
- Samakan nuansa loading/error dan fallback dengan My Files:
  - Loading preview
  - Preview unavailable fallback
  - Text preview too-large: tampilkan UI yang konsisten (lebih mirip My Files) jika memungkinkan tanpa mengubah logic fetch.
- Text terlalu besar tetap dihitung via limit (existing logic).

## Non-goals reminder
- Tidak mengubah:
  - backend/service/route
  - action menu/right-click/grid/list toolbar
  - rules previewability folder/file
  - rowKey/id separation

## Acceptance criteria (parity behavior)
- Semua jenis preview yang saat ini didukung GDrive tetap berfungsi.
- Modal preview GDrive secara visual dan affordance (header tools) setidaknya mengikuti My Files.
- Download dari modal preview header berfungsi tanpa regresi.
- Close preview tetap membersihkan object URL dengan aman.

# Proposal: implement-gdrive-grid-list-view

## Problem
Halaman **GDrive** saat ini hanya memiliki tampilan **list/row**. User membutuhkan kemampuan untuk memilih tampilan **grid/card** atau tetap memakai **list/row** seperti file manager.

## Goal
Menambahkan toggle **Grid/List** di halaman GDrive.
- **List** mempertahankan tampilan row/table existing.
- **Grid** menampilkan file/folder dalam bentuk card/kotak.
- Section **“Folders”** dan **“Files”** tetap terpisah pada **kedua mode**.

## Non-goal
- Tidak mengubah backend/service/API.
- Tidak mengubah logic upload/preview/download.
- Tidak mengubah logic trash/restore/delete permanent.
- Tidak mengubah preview modal.
- Tidak mengubah behavior **right-click** / action dropdown.
- Tidak membuat nested folder navigation.

## Scope
- Frontend-only, implementasi dilakukan di `frontend/src/app/pages/GDrive.tsx`.
- Tidak menyentuh service/route/backend.
- Action menu dan right-click tetap mengikuti desain yang sudah ada.


# Design: implement-gdrive-grid-list-view

## Overview
Menambahkan state `viewMode` untuk mengontrol tampilan **list** (row/table existing) atau **grid** (card).

## State
Tambahkan state:
```ts
const [viewMode, setViewMode] = useState<"list" | "grid">("list");
```

## Toggle UI (Toolbar/Header)
Tambahkan toggle UI di area toolbar/header halaman GDrive.
- Button: **List** dan **Grid**.
- Active state mengikuti theme/color styling yang sudah digunakan di GDrive.

## Data source
Data sumber tetap:
- `folderItems`
- `regularFileItems`

## Rendering
### Jika `viewMode === "list"`
- Gunakan rendering row/table existing tanpa perubahan perilaku.
- Section **Folders** dan **Files** tetap terpisah.

### Jika `viewMode === "grid"`
- Render card-grid untuk:
  - `folderItems`
  - `regularFileItems`
- Section **Folders** dan **Files** tetap terpisah.

## Grid card minimal (konten)
Card untuk setiap item menampilkan minimal:
- icon file/folder
- name
- type label (menggunakan logic label yang sudah ada)
- modified time
- size
- shared/visibility bila field/label tersebut sudah tersedia di data
- tombol **⋯** (action)

## Action menu & right-click compatibility (WAJIB PRESERVE)
- Tetap reuse `renderFileActions(file)` untuk tombol/tindakan.
- Right-click tetap pakai `handleFileContextMenu(event, file)`.
- Tombol **⋯** di grid card tetap memakai:
  - `file.rowKey` untuk UI `key/state`
  - `actionButtonRefs` untuk positioning
  - state/action menu position yang sudah ada

## Preserve requirements
- Tetap gunakan:
  - `file.rowKey` untuk UI key/state
  - `file.id` untuk API action
- Folder tetap menyembunyikan aksi yang semestinya tidak berlaku (mis. Preview/Download) mengikuti behavior existing.
- Click-outside dan Escape tetap bekerja (menu action menu).
- **preview modal tidak disentuh**.

## Risiko
- `GDrive.tsx` sudah besar, sehingga patch harus kecil.
- Perhatikan konsistensi `rowKey` ↔ `openActionFileId` agar action menu tidak “salah item”.
- Hindari refactor besar; cukup tambahkan conditional render untuk `list` vs `grid`.


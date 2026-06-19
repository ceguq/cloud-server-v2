# Add GDrive UI — Implementation Tasks

## 1) Docs
- [x] proposal.md dibuat
- [x] design.md dibuat
- [ ] tasks.md dibuat (Checklist ini)

## 2) UI Icon
- [x] Buat `frontend/src/app/components/GDriveIcon.tsx`
  - `export function GDriveIcon({ className?, size? }: GDriveIconProps)`
  - SVG multicolor
  - Kompatibel untuk dipakai sidebar (prop `size={16}`)

## 3) UI Page
- [ ] Buat `frontend/src/app/pages/GDrive.tsx`
  - Root container: `h-full min-h-0 overflow-hidden`
  - Data dummy:
    - `gdriveAccounts`
    - `gdriveAllFiles`
  - UI sections sesuai design:
    - panel kiri akun
    - tab browser
    - search
    - list/grid toggle
    - empty state "No files found"
  - Helper lokal: `renderGDriveFileIcon(...)`

## 4) Integrasi Sidebar
- [x] Edit `frontend/src/app/components/Sidebar.tsx`
  - Tambah import `GDriveIcon`
  - Tambah nav item setelah My Files:
    - id: "gdrive"
    - label: "GDrive"
    - path: "/gdrive"

## 5) Integrasi Routing
- [x] Edit `frontend/src/app/App.tsx`
  - import `GDrive`
  - tambah ke object `pages`: `gdrive: GDrive`
  - tambah mapping `pathToActivePage`: `"/gdrive": "gdrive"`

## 6) Verifikasi Manual (tanpa command)
- [x] Sidebar menampilkan menu "GDrive"
- [x] Klik GDrive membuka `/gdrive`
- [x] Halaman tampil dengan UI dummy tanpa API/OAuth



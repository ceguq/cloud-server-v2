# Add GDrive UI — Design Notes

## Ikon
- Komponen baru `GDriveIcon` (SVG multicolor, mirip Google Drive) agar bisa dipakai di Sidebar.
- Disediakan props:
  - `className?: string`
  - `size?: number`

## Layout Halaman `/gdrive`
Root container:
- `className="h-full min-h-0 overflow-hidden"`
- Scroll di area internal dengan `overflow-y-auto`.

### Panel kiri (akun)
- Header: **Google Drive**
- Tombol: **+ Connect** (UI-only)
- Teks: **accounts connected**
- Card akun personal/work:
  - status: **Connected**
  - storage bar per akun

### Area utama (browser file)
- Header: **Google Drive**
- Tabs: **All Files, Starred, Shared, Recent** (UI-only, local state)
- Search input
- Toggle: list/grid
- File rendering:
  - list/table rows untuk list mode
  - grid cards untuk grid mode
- Empty state:
  - **No files found**

## Data
- `gdriveAccounts` (dummy akun)
- `gdriveAllFiles` (dummy file)
- Filtering/search/tab dilakukan sepenuhnya di local state.

## Styling
- Rounded card, border halus, warna kompatibel dark/light.
- Tidak menabrak theme existing (pakai pendekatan `resolvedTheme` + inline style warna).

## Integrasi
- Tambah item menu GDrive di Sidebar setelah **My Files**.
- Routing ke `/gdrive` via mapping `pathToActivePage` dan `pages` di `App.tsx`.


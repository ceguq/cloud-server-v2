# OpenSpec Design: implement-gdrive-right-click-actions

## Target file
- `frontend/src/app/pages/GDrive.tsx`

## Reuse existing action menu
- Tetap gunakan existing renderer:
  - `renderFileActions(file)`
- UI state dibuka/tutup pakai state yang sudah ada:
  - `openActionFileId`
  - `actionMenuRef`
  - `actionMenuPosition` (dropdown `position: fixed`)
- Handler tombol ⋯ yang sudah ada **tidak diubah** positioning logic-nya.

## Add new right-click handler (context menu)
Nama handler yang disarankan:
- `handleFileContextMenu(event, file)`

Behavior yang wajib:
1. `event.preventDefault()` (blokir native context menu)
2. Buka menu untuk `file` yang di-right-click
   - set `openActionFileId` berdasarkan `file.rowKey`
3. Posisi dropdown menggunakan koordinat mouse
   - `event.clientX`, `event.clientY`
   - menu tetap `position: fixed`
4. Clamp / safety positioning
   - Menu tidak boleh keluar viewport
   - Jika ada helper clamp positioning existing, reuse minimal.
   - Jika tidak ada, buat logic clamp lokal yang ringan:
     - `left = clamp(event.clientX, 12, window.innerWidth - ACTION_MENU_WIDTH - 12)`
     - `top = clamp(event.clientY, 12, window.innerHeight - <approx menu height> - 12)`

## Dropdown open/close lifecycle (preserve)
- Dropdown tetap ter-close dengan:
  - `click-outside` via document listener yang sudah ada
  - `Escape` via document keydown listener yang sudah ada
  - scroll/wheel close yang sudah ada
- `closeActionMenu()` dipakai untuk menutup

## Attach `onContextMenu` pada row/card containers
- Tambahkan `onContextMenu={...}` pada container row/card untuk:
  - section Folder
  - section Regular Files
- Pastikan handler tidak terpasang pada:
  - tombol ⋯ (atau elemen yang sudah memicu open)
  - link/button/action control lain (hindari bentrok)

Prinsip implementasi:
- `onContextMenu` dipasang di container utama item.
- Di handler, guard dengan `event.target` agar tidak men-trigger dari tombol ⋯:
  - bila target berada di dalam elemen yang punya atribut `data-gdrive-action-menu="true"` (atau elemen tombol ⋯ / action button ref), maka return.
  - Alternatif: cukup pastikan tombol ⋯ stopPropagation untuk event contextmenu bila perlu.

## Action availability rules (preserve existing)
- Tidak mengubah logika di `renderFileActions(file)`.
- Rules yang harus tetap berjalan secara otomatis karena `renderFileActions(file)`:
  - `driveListMode !== "trash"` untuk Preview/Open/Details/Download/Copy
  - folder tidak menampilkan Preview/Download (sesuai logic existing `isGDrivePreviewable` dan `isGDriveFolder`)
  - mode trash hanya menampilkan Restore dan (jika sudah ada) Delete Permanently

## Positioning differences: ⋯ vs right-click
- Tombol ⋯:
  - tetap pakai positioning dari `getBoundingClientRect()` (existing)
- Right-click:
  - memakai `event.clientX/clientY` (baru)
  - tetap clamp agar tidak keluar viewport

## Non-goals yang dijaga
- Tidak menambah native context menu custom global.
- Tidak mengubah backend/service/route.
- Tidak mengubah preview modal.
- Tidak melakukan API request pada right-click; hanya membuka menu.

## Verification checklist (design-level)
- Right-click file/folder membuka menu yang sama.
- Menu tidak menggandakan open (sekali saja).
- ⋯ tetap membuka menu seperti sebelumnya.
- click-outside dan Escape tetap menutup.


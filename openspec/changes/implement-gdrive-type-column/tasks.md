# Tasks: GDrive Type Column

Checklist implementasi (Frontend-only):

1. [x] Tambahkan helper type classification di `GDrive.tsx`.
   - [x] Input: `mime` dan `name`
   - [x] Output: { label, detail, (opsional) shortMime/extension }
   - [x] Implementasi mapping sesuai design (workspace → folder → mime substring → extension → default).

2. [x] Tambahkan area/kolom Type pada row file.
   - [x] Menambahkan placement di grid agar selaras dengan kolom existing.
   - [x] Styling untuk label utama + detail kecil.

3. [x] Pindahkan Workspace badge ke area Type.
   - [x] Hapus/kurangi badge workspace yang berada dekat nama file.
   - [x] Pastikan workspace info tampil di Type area.

4. [x] Pastikan action dropdown `⋯` tidak berubah.
   - [x] Behavior open/close & posisi tetap sama.
   - [x] Tidak mengubah handler terkait menu action.

5. [x] Pastikan responsive layout tetap aman.
   - [x] Kolom Type tidak memotong action/menu.
   - [x] Truncation/width constraints sesuai kebutuhan.

6. [x] Test build manual oleh user.
   - [x] Cek tipe file: Docs/Sheets/Slides/Drawing, Folder, Image/PDF/Archive/Text, default File.
   - [x] Cek action dropdown dan click-outside tetap normal.
   - [x] Cek tampilan di beberapa ukuran layar.



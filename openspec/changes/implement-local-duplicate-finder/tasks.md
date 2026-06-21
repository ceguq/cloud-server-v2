# Tasks: Local Duplicate Finder (implement-local-duplicate-finder)

## Checklist (kecil & aman)
- [ ] Audit model `File` apakah sudah memiliki field **checksum/hash**.
- [ ] Audit backend `FileController` dan route `backend/routes/api.php` untuk memastikan endpoint **read-only** dapat ditambahkan tanpa mempengaruhi endpoint existing.
- [ ] Tentukan strategi deteksi awal:
  - [ ] Gunakan **checksum/hash** jika tersedia.
  - [ ] Jika belum ada, fallback ke `size + original_name`.
- [ ] Tentukan/define query untuk mendapatkan data kandidat duplikat hanya untuk user yang sedang login dan hanya file aktif yang relevan.
- [ ] Tambah endpoint read-only untuk duplicate candidates: mis. `GET /api/files/duplicates`.
- [ ] Pastikan response berupa group dengan struktur:
  - `duplicate_key`, `total_size`, `count`, dan `files[]`.
- [ ] Tambah service frontend untuk mengambil duplicate candidates (mis. method di `fileService` atau service baru).
- [ ] Tambah UI kecil untuk menampilkan kandidat duplikat di `My Files` (read-only).
- [ ] Pastikan **tidak ada auto delete**.
- [ ] Pastikan **tidak ada perubahan upload flow** (termasuk drag-and-drop upload).
- [ ] Pastikan tidak mengubah fitur GDrive.
- [ ] Manual check:
  - [ ] File unik tidak muncul dalam group kandidat.
  - [ ] File yang kandidat duplikat muncul dalam group.
  - [ ] Preview/download/open file tetap berfungsi.
  - [ ] Bulk action delete/preview/download tetap aman dan tidak terpengaruh.

## Acceptance criteria (read-only)
- [ ] User dapat melihat daftar group kandidat duplikat pada local NimbusDrive / My Files.
- [ ] Tidak ada mekanisme delete dari fitur ini.
- [ ] Fitur upload, preview, download, dan drag-and-drop tetap tidak berubah perilakunya.


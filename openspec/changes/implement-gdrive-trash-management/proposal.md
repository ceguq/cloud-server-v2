# OpenSpec Proposal: implement-gdrive-trash-management

## Ringkasan
Fitur ini menambahkan manajemen Trash khusus untuk file Google Drive di halaman **Google Drive (Nimbus)**.

Perubahan besar yang diinginkan:
- Dari UI Nimbus pada dropdown aksi file GDrive, tombol **Trash** tidak lagi melakukan tindakan Trash lokal.
- Melainkan memindahkan file GDrive ke **Google Drive Trash** menggunakan Google Drive API.
- Restore mengembalikan file dari Google Drive Trash ke lokasi normalnya.
- Listing normal tetap hanya menampilkan file dengan `trashed=false` (sesuai API query saat ini).

## Goals
1. File GDrive dapat dipindahkan ke Google Drive trash dari UI Nimbus.
2. Restore dari trash bisa mengembalikan file ke listing normal.
3. Dropdown “Trash” pada file GDrive mengarah ke endpoint “move-to-trash” (bukan Trash lokal Nimbus).
4. Tidak ada delete permanent (hard delete) di tahap ini.
5. Tidak ada penghapusan data file Nimbus lokal.
6. Tidak mencampur konsep trash GDrive dengan trash lokal Nimbus.

## Non-Goals (batasan)
- Tidak implement “Trash tab” terpisah untuk Nimbus local.
- Tidak mengimplement “Empty Trash / delete permanent”.
- Tidak mengubah halaman Trash lokal.
- Tidak menghapus file lokal Nimbus.

## Perilaku yang diharapkan
- Saat user menekan **Trash** untuk file GDrive:
  - Sistem memanggil endpoint: `POST /api/gdrive/accounts/{account}/files/{fileId}/trash`.
  - Backend menjalankan `files.update` dengan `trashed=true`.
  - Setelah sukses, file akan hilang dari listing normal (karena listing normal mensyaratkan `trashed=false`).
- Saat user menekan **Restore** (kedepan / bila UI action restore tersedia):
  - Sistem memanggil endpoint: `POST /api/gdrive/accounts/{account}/files/{fileId}/restore`.
  - Backend menjalankan `files.update` dengan `trashed=false`.
  - Setelah sukses, file kembali tampil di listing normal.
- Tidak ada tindakan permanent delete.

## Future Improvement
- Tambahkan halaman/section **Trash** yang punya tab:
  1) **Nimbus Files** (trash lokal)
  2) **Google Drive** (trash Google)

## Dampak
- UI/flow file GDrive menjadi konsisten dengan konsep Trash pada Google Drive.
- Tidak ada perubahan model data/behavior trash lokal Nimbus.

## Endpoint yang direncanakan
- `POST /api/gdrive/accounts/{account}/files/{fileId}/trash`
- `POST /api/gdrive/accounts/{account}/files/{fileId}/restore`


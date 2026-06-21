# Proposal: Storage Quota Alert (Hampir Penuh)

## Problem
Saat ini user belum mendapat peringatan yang jelas ketika kapasitas storage hampir penuh. Akibatnya:
- User baru menyadari storage penuh ketika proses upload/penambahan file sudah gagal.
- User cenderung panik atau harus mencari file yang bisa dihapus tanpa ada petunjuk prior.

## Benefits
Dengan adanya alert storage quota:
- User bisa melakukan aksi lebih awal (menghapus file lama, merapikan folder, atau upgrade plan) sebelum upload gagal.
- Mengurangi friksi dan meningkatkan prediktabilitas perilaku sistem.

## Scope
- Implementasi alert **khusus non-GDrive/local storage**.
- Menggunakan data yang sudah tersedia dari API / storage service yang digunakan frontend.
- Alert berbasis persentase penggunaan storage (`usage_percent` / field percentage yang sudah ada dari response storage API).

## Non-goals
- Tidak menambahkan dukungan **GDrive**.
- Tidak menambah modul billing / upgrade plan / perubahan paket.
- Tidak mengubah backend maupun menambah endpoint baru jika data percentage/usage_percent sudah tersedia.
- Tidak menambah database.
- Implementasi awal dibuat **kecil** dan tidak mengubah upload flow.


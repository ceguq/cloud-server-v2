# Proposal: Local Duplicate Finder (NimbusDrive / My Files)

## Problem
NimbusDrive V2 (local NimbusDrive / “My Files”) menyimpan banyak file pengguna di storage lokal. Tanpa fitur yang membantu mendeteksi file yang kemungkinan duplikat, pengguna:
- Sulit mengetahui file mana yang sebenarnya sama/identik.
- Cenderung melakukan cleanup secara manual (membuka file satu per satu) yang memakan waktu.
- Berisiko terjadi peningkatan penggunaan storage karena file duplikat yang tidak disadari.

Saat ini tidak ada mekanisme yang jelas untuk menampilkan daftar “kandidat duplikat” khusus untuk local storage.

## Goal
Menambahkan **Duplicate Finder untuk local NimbusDrive / My Files** agar pengguna dapat melihat **daftar file yang kemungkinan duplikat**.

## Scope
- **Local storage only** (NimbusDrive / My Files)
- Implementasi **read-only** pada tahap awal:
  - Tampilkan **kandidat duplikat**.
  - Tidak ada penghapusan otomatis.
  - Tidak ada bulk delete otomatis.
  - Tidak ada auto-select file.
- Backend dan frontend hanya menambahkan dukungan untuk menampilkan informasi duplikat.

## Non-goals
Pada tahap ini, hal berikut **tidak dilakukan**:
- Tidak mengubah/menambahkan fitur untuk **GDrive**.
- Tidak menghapus file secara otomatis maupun otomatis bulk delete.
- Tidak menambahkan aksi delete/bulk delete yang terhubung langsung dari fitur duplicate finder.
- Tidak mengubah mekanisme **upload flow**.
- Tidak mengubah fitur **drag-and-drop upload** yang sudah selesai.
- Tidak mengubah fitur **storage quota alert** yang sudah selesai.
- Tidak melanjutkan fitur **keyboard shortcut**.


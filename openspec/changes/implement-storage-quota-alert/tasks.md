# Tasks: Storage Quota Alert

Checklist implementasi (OpenSpec-driven, awal kecil)

## Audit & integration data
- [x] Audit shape response storage API/service yang dipakai frontend (pastikan field percentage yang dipakai benar).
- [x] Tentukan field yang menjadi sumber kebenaran (disarankan `usage_percent`).


## Logic helper
- [x] Tambah helper kecil untuk menentukan status quota:
  - `normal` (<85)
  - `warning` (>=85 & <95)
  - `critical` (>=95)

## UI (kecil) di target placement
- [x] Tambahkan UI alert kecil di `Sidebar` (dekat storage bar yang sudah ada).
- [x] Pastikan alert hanya muncul saat threshold tercapai (tidak tampil saat normal).
- [x] Gunakan warna/teks yang theme-aware untuk light/dark.
- [x] Hindari perubahan layout yang besar (tanpa modal besar, tanpa komponen overlay besar).

## Manual check
- [x] Manual check: `usage_percent` normal (<85) => tidak ada alert.
- [x] Manual check: `usage_percent >= 85` dan `< 95` => tampil alert warning.
- [x] Manual check: `usage_percent >= 95` => tampil alert critical.



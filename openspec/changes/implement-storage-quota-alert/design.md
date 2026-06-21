# Design: Storage Quota Alert

## Overview
Menambahkan peringatan kecil dan theme-aware ketika penggunaan storage mencapai threshold.

Alert akan muncul saat penggunaan storage (percentage) melewati batas tertentu:
- **Warning**: `>= 85%`
- **Critical**: `>= 95%`

## Data source
- Gunakan storage percentage yang sudah tersedia dari storage API/service yang saat ini dipakai frontend.
- Dalam frontend, field yang direncanakan untuk dipakai adalah `usage_percent` (sebagaimana sudah ada di `StorageInfo`).

## Threshold & status
Definisikan 3 status berdasarkan percentage:
- `normal`: `< 85%`
- `warning`: `>= 85%` dan `< 95%`
- `critical`: `>= 95%`

Mapping UI sederhana:
- `warning` -> badge/teks “Storage nearly full” (warna amber)
- `critical` -> badge/teks “Storage critically full” (warna red)

## UI placement (implementasi awal kecil)
Implementasi awal disarankan di:
- `frontend/src/app/components/Sidebar.tsx`

Alasan:
- Sidebar sudah menampilkan storage bar/usage.
- Implementasi alert tambahan dapat ditempatkan dekat storage bar tanpa mengubah struktur layout halaman lain.

Alternatif (opsional untuk iterasi berikutnya): bisa juga ditambahkan di Dashboard bila dibutuhkan, namun initial scope harus tetap kecil.

## UI requirements
- **Theme-aware**: warna/teks harus aman di light/dark.
- **Tidak mengganggu layout**: gunakan ukuran kecil (badge/line) dan tidak menambah modal besar.
- **Tidak mengubah upload flow**: alert hanya menampilkan informasi/status.
- **Muncul hanya saat threshold tercapai**:
  - status `normal` tidak menampilkan alert.
  - `warning` dan `critical` menampilkan alert masing-masing.

## Acceptance criteria (UI)
- Ketika `usage_percent < 85%`: tidak ada alert.
- Ketika `usage_percent >= 85%` dan `< 95%`: tampil alert warning.
- Ketika `usage_percent >= 95%`: tampil alert critical.
- Layout Sidebar tetap rapi dan tidak overflow.


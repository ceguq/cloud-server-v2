# OpenSpec Proposal — implement-dashboard-shared-links-count

## Summary
Menjadikan widget **Shared Links Count** di halaman **Dashboard** menjadi **real data** yang berasal dari backend endpoint **`GET /api/share-links`**, menggantikan dummy/static value.

Perubahan hanya pada wiring frontend/UI logic (via halaman dan/atau helper yang dibutuhkan). **Tidak membuat endpoint backend baru** pada change ini.

## Problem
Saat ini widget **Shared Links Count** masih menampilkan nilai dummy:
- `value: "243"`
- `sub: "active links"`
- `change: "-3%"`

Hal ini menyesatkan karena jumlah share links seharusnya berasal dari kondisi backend user.

## Goals (scope kecil)
1. Mengambil daftar share links dari backend melalui `GET /api/share-links`.
2. Menghitung jumlah (count) share links berdasarkan response backend.
3. Menampilkan count tersebut pada widget Dashboard **Shared Links Count**.
4. Menambahkan loading/error handling yang aman (tanpa fallback dummy untuk count).

## Non-Goals
Tidak mengerjakan:
- Storage Breakdown Chart
- Server Status
- Sync Status
- Active Devices
- Recent Activity

Tidak membuat/menambah/mengubah backend routes/controller pada change ini.

## Source of Truth (read-only audit)
- Backend route yang tersedia: `GET /api/share-links`.
- Controller yang menyediakan data: `ShareController::index`.

## Assumptions / Status tagging
- `CONFIRMED`: Endpoint `GET /api/share-links` ada (route & controller ditemukan di kode repo).
- `ASSUMPTION`: Bentuk response `data` adalah array share links sehingga count dapat dihitung langsung dari panjang array.

## Out of scope UI elements
- Persentase `change: "-3%"` pada badge trend: change ini tidak memutuskan angka trend dinamis dulu. Implementasi dapat mempertahankan value badge trend sebagai statis/placeholder UI, selama **angka count** sudah real.



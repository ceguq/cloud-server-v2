# OpenSpec Proposal — implement-dashboard-active-devices-count

## Summary
Menjadikan widget **Active Devices Count** di halaman **Dashboard** menjadi **real data** yang berasal dari backend endpoint **`GET /api/devices`**, sehingga nilai dummy pada Dashboard akan diganti dengan count device milik user.

Perubahan hanya pada wiring frontend/UI logic untuk menghitung jumlah device dari response `GET /api/devices`. **Tidak membuat endpoint backend baru** pada change ini.

## Problem
Saat ini widget **Active Devices Count** masih menampilkan dummy/static value pada Dashboard.

## Goals (scope kecil)
1. Mengambil daftar devices dari backend melalui `GET /api/devices`.
2. Menghitung jumlah (count) devices dari response.
3. Menampilkan count tersebut pada widget Dashboard **Active Devices Count**.
4. Menambahkan loading/error handling yang aman (tanpa fallback dummy untuk count).

## Non-Goals
Tidak mengerjakan:
- Storage Breakdown Chart
- Server Status
- Sync Status
- Recent Activity
- Storage used/files count

Tidak membuat/menambah route backend pada change ini.

## Source of Truth
- Backend route yang tersedia: **`GET /api/devices`**.
- Controller: `DeviceController::index`.
- Frontend service yang sudah ada: `frontend/src/services/deviceService.ts`.

## Assumptions / Status tagging
- `CONFIRMED`: Endpoint `GET /api/devices` dan controller `DeviceController::index` tersedia.
- `ASSUMPTION`: `deviceService.getDevices()` mengembalikan array devices sehingga count bisa dihitung langsung dari `length`.

## Out of scope UI elements
- Hanya widget **Active Devices Count** di Dashboard.
- Tidak mengubah layout besar Dashboard.


# OpenSpec Tasks — implement-dashboard-active-devices-count

## 1. Audit response shape deviceService
- [ ] Pastikan method `frontend/src/services/deviceService.ts` yang dipakai adalah `getDevices()`.
- [ ] Konfirmasi bentuk response yang dikembalikan oleh `getDevices()`:
  - apakah langsung array `Device[]` atau wrapped.
  - field minimal yang dibutuhkan untuk count (cukup length).

## 2. Wiring Dashboard ke deviceService (tanpa implement dummy)
- [ ] Tentukan lokasi tepat di `frontend/src/app/pages/Dashboard.tsx` untuk mengganti dummy **Active Devices Count**.
- [ ] Buat state baru khusus:
  - `activeDevicesCount`
  - `activeDevicesLoading`
  - `activeDevicesError`
- [ ] Tambahkan `useEffect`/hook untuk memanggil `deviceService.getDevices()`.

## 3. Hitung jumlah device
- [ ] Setelah response diterima, hitung jumlah:
  - `count = devices.length` jika response array
  - atau `devices.data.length` jika wrapped `{ data: [...] }`.
- [ ] Pastikan tidak ada hardcoded value menggantikan count.

## 4. Loading & error handling aman
- [ ] Saat loading, tampilkan `"..."` pada angka **Active Devices Count**.
- [ ] Saat error:
  - tampilkan angka `0`
  - jangan crash.

## 5. Update UI card yang terkena
- [ ] Ganti dummy/static angka pada card `kind: "devices"` menjadi `activeDevicesCount`.
- [ ] Pastikan field lain boleh tetap dummy selama tidak memengaruhi angka count.

## 6. Manual test checklist (user-led)
- [ ] Login sebagai user non-admin.
- [ ] Buka halaman Dashboard.
- [ ] Buka halaman Devices (halaman list devices).
- [ ] Bandingkan angka Active Devices Count di Dashboard dengan jumlah item devices pada halaman Devices.
- [ ] Refresh browser dan pastikan angka tetap real.
- [ ] Matikan koneksi / pastikan API gagal, pastikan Dashboard tidak crash dan angka menjadi `0`.

## Definition of Done
- [ ] Widget Active Devices Count tidak lagi menggunakan dummy value.
- [ ] Angka berasal dari `GET /api/devices` via `deviceService.getDevices()`.
- [ ] Loading/error handling ada.
- [ ] Hanya scope Dashboard Active Devices Count (tidak mengerjakan widget lain).


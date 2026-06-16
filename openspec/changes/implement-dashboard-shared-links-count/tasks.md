# OpenSpec Tasks — implement-dashboard-shared-links-count

## 1. Audit response shape shareService
- [x] Pastikan method `frontend/src/services/shareService.ts` yang dipakai untuk mengambil data share links adalah `getShareLinks()`.
- [x] Konfirmasi bentuk response yang dikembalikan oleh `getShareLinks()`:
  - apakah langsung array `ShareLink[]` atau wrapped.
  - field minimal yang dibutuhkan untuk count (cukup panjang array).


## 2. Wiring Dashboard ke shareService (tanpa implement dummy)
- [ ] Tentukan lokasi tepat di `frontend/src/app/pages/Dashboard.tsx` untuk mengganti dummy **Shared Links Count** card.
- [ ] Buat state `sharedLinksCount` (atau sejenis) dan state `sharedLinksLoading`/`sharedLinksError`.
- [ ] Tambahkan `useEffect`/hook untuk memanggil `shareService.getShareLinks()`.

## 3. Hitung jumlah share links
- [ ] Setelah response diterima, hitung jumlah:
  - `count = shares.length` (jika response adalah array)
  - atau ambil `shares.data.length` jika response berbentuk `{ data: [...] }`.
- [ ] Pastikan tidak ada hardcoded value menggantikan count.

## 4. Loading & error handling aman
- [ ] Saat loading, tampilkan spinner/placeholder pada angka **Shared Links Count** (tanpa angka dummy seperti "243").
- [ ] Saat error:
  - tampilkan label error yang aman (mis. "—" atau "Unavailable")
  - jangan crash.

## 5. Update UI card yang terkena
- [x] Hapus dummy value `"243"` untuk card `kind: "shared"`.

- [x] Pastikan field lain boleh tetap dummy (mis. `sub` dan `change`) selama angka count sudah real.


## 6. Manual test checklist (user-led)
- [ ] Login sebagai user non-admin.
- [ ] Buka halaman Dashboard.
- [ ] Verifikasi angka Shared Links Count berubah sesuai data share links user.
- [ ] Buat kondisi user memiliki 0 share links (jika tersedia secara manual), pastikan angka tampil 0 atau empty-state yang sesuai.
- [ ] Matikan koneksi / pastikan API gagal, pastikan UI tidak crash dan menampilkan error state aman.

## Definition of Done
- [x] Widget Shared Links Count tidak lagi menggunakan dummy value.

- [x] Angka berasal dari `GET /api/share-links` via `shareService.getShareLinks()`.
- [x] Loading/error handling ada.
- [ ] Hanya scope Dashboard Shared Links Count (tidak mengerjakan widget lain).


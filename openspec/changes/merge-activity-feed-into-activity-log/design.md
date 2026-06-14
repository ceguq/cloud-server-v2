# OpenSpec Design

## Current Behavior
- `GET /activity-feed` (menu “Activity”): merender `frontend/src/app/pages/Activity.tsx` (dummy/static), termasuk fitur bulk delete tampilan yang tersimpan di `localStorage`.
- `GET /activity` (menu “Activity Log”): merender `frontend/src/pages/ActivityLogPage.tsx` (real backend), menampilkan log dari `/api/activity-logs` dan filter berdasarkan aksi.

## Proposed Behavior
- `GET /activity-feed` harus merender `ActivityLogPage` (real backend).
- `GET /activity` tetap merender `ActivityLogPage`.
- `Activity.tsx` **tidak dihapus** dan tetap ada sebagai legacy, namun tidak menjadi komponen yang dirender untuk route yang dituju.

## Technical Design
Perubahan dilakukan pada level routing/rendering di:
- `frontend/src/app/App.tsx`

Poin teknis yang harus dipenuhi:
1. `pages.activity` diarahkan agar tidak lagi mereferensikan dummy `Activity.tsx` untuk kebutuhan route alias (diganti/diarahkan ke `ActivityLogPage`).
2. `routePages["/activity-feed"]` diarahkan ke `ActivityLogPage`.
3. `routePages["/activity"]` tetap ke `ActivityLogPage`.
4. `pathToActivePage["/activity-feed"]` tetap bernilai `"activity"` agar menu “Activity” tetap ter-highlight.
5. `pathToActivePage["/activity"]` tetap bernilai `"activity-log"` agar menu “Activity Log” tetap ter-highlight.

Catatan: `frontend/src/app/components/Sidebar.tsx` tidak diubah. Seluruh perilaku ditangani via mapping di `App.tsx`.

## Files Likely Affected
- `frontend/src/app/App.tsx`

## Manual Verification (tanpa command automasi)
- Buka `/activity-feed` dan pastikan halaman menampilkan UI “Activity Log” dan data berasal dari backend (bukan dummy hardcoded).
- Buka `/activity` dan pastikan hasil tetap Activity Log.
- Pastikan highlight sidebar:
  - `/activity-feed` -> aktif di menu “Activity”.
  - `/activity` -> aktif di menu “Activity Log”.
- Pastikan console tidak menampilkan error runtime.


# OpenSpec Tasks

## Checklist
- [x] Inspect `frontend/src/app/pages/Activity.tsx`, `frontend/src/pages/ActivityLogPage.tsx`, `frontend/src/app/components/Sidebar.tsx`, dan `frontend/src/app/App.tsx` secara read-only.
- [x] Tambahkan route alias `/activity-feed` ke `ActivityLogPage` (melalui mapping render di `frontend/src/app/App.tsx`).
- [x] Perbaiki blank screen/error yang muncul akibat referensi `Activity` yang tidak didefinisikan (penyesuaian minimal pada mapping `frontend/src/app/App.tsx`).
- [x] Pastikan `Activity.tsx` tetap ada sebagai legacy.
- [ ] Test manual di browser:

  - [ ] `/activity-feed` tampil `ActivityLogPage` (bukan Activity dummy/static).
  - [ ] `/activity` tampil `ActivityLogPage`.
  - [ ] menu **Activity** highlight tetap aktif saat berada di `/activity-feed`.
  - [ ] menu **Activity Log** highlight tetap aktif saat berada di `/activity`.
  - [ ] Console tidak ada error merah.


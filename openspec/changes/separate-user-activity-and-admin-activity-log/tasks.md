# Tasks: separate-user-activity-and-admin-activity-log

* [ ] Task 1: Inspeksi routing & sidebar (read-only).

  * Target file (untuk inspeksi tahap implementasi nanti):
    * `frontend/src/app/App.tsx`
    * `frontend/src/app/components/Sidebar.tsx`

  * Tujuan:
    * Pastikan route Activity (user-facing) dan Activity Log (admin/audit) benar-benar terpisah.
    * Pastikan active menu highlight sesuai ekspektasi.
    * Pastikan admin guard/role handling untuk halaman audit jelas (minimal untuk visibility & akses).


* [ ] Task 2: Inspeksi halaman Activity user (read-only).

  * Target file:
    * `frontend/src/app/pages/Activity.tsx`

  * Tujuan:
    * Temukan bagian yang masih dummy/static.
    * Catat struktur UI yang mendekati desain Figma.
    * Identifikasi gap data: bahwa backend existing `GET /activity-logs` saat ini user-scoped (untuk kebutuhan Activity user).

* [ ] Task 3: Inspeksi Activity Log admin (read-only).

  * Target file:
    * `frontend/src/pages/ActivityLogPage.tsx`

  * Tujuan:
    * Pastikan data source audit/log berasal dari backend.
    * Pastikan kemampuan filter/delete yang ada cocok untuk audit/admin UI.
    * Validasi bahwa backend existing belum mendukung admin global logs, sehingga admin/global scope perlu task backend terpisah.


* [ ] Task 4: Tentukan route final Activity user vs Activity Log admin.

  * Target file nanti:
    * `frontend/src/app/App.tsx`
    * `frontend/src/app/components/Sidebar.tsx`

  * Tujuan:
    * Activity user punya route jelas yang tidak memakai audit page admin.
    * Activity Log admin punya route jelas.
    * Tidak ada duplikasi konsep yang membingungkan.

* [ ] Task 5: Pulihkan Activity user sebagai halaman user-facing.

  * Target file nanti:
    * `frontend/src/app/App.tsx`
    * `frontend/src/app/pages/Activity.tsx`

  * Tujuan:
    * Activity tidak lagi memakai ActivityLogPage admin sebagai final.
    * Activity tidak dummy/hardcoded pada tahap implementasi berikutnya.

* [ ] Task 6: Ganti data dummy Activity user menjadi data real.

  * Target file nanti:
    * `frontend/src/app/pages/Activity.tsx`
    * service API terkait (jika sudah ada) atau service baru untuk activity user

  * Tujuan:
    * Activity user menggunakan backend yang bisa difilter berdasarkan user saat ini.
    * Jika backend belum siap, catat sebagai task backend terpisah.

* [ ] Task 7: Rapikan UI Activity user sesuai desain Figma.

  * Target file nanti:
    * `frontend/src/app/pages/Activity.tsx`

  * Tujuan:
    * Timeline/card/list modern.
    * Tetap responsive.

* [ ] Task 8: Pastikan Activity Log tetap admin/audit.

  * Target file nanti:
    * `frontend/src/pages/ActivityLogPage.tsx`
    * `frontend/src/app/App.tsx`
    * `frontend/src/app/components/Sidebar.tsx`

  * Tujuan:
    * Activity Log tidak tampil sebagai halaman utama user biasa.
    * Jika guard sudah ada, gunakan guard yang ada tanpa refactor besar.
    * Jika belum ada, tentukan titik guard paling aman.

* [ ] Task 9: Manual verification (tanpa automation).

  * Login sebagai user biasa:
    * User melihat menu Activity.
    * Activity menampilkan UI Figma dan data real milik user.
    * User tidak melihat halaman audit admin jika bukan admin.

  * Login sebagai admin:
    * Admin bisa melihat Activity (user-facing) dan Activity Log (audit).
    * Activity Log menampilkan audit log teknis.

  * Console browser:
    * Tidak ada error merah.


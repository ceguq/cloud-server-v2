# Design: separate-user-activity-and-admin-activity-log

## Product Decision

**Activity** dan **Activity Log** adalah dua halaman berbeda dan tidak boleh diperlakukan sebagai fitur yang sama.

## Activity (User-Facing)

Activity adalah halaman aktivitas untuk user biasa.

Expected behavior:
- Menampilkan aktivitas milik **user yang sedang login**.
- UI berbentuk **timeline/card/list modern** sesuai desain Figma.
- Menampilkan aktivitas seperti:
  - upload, download, share, delete, restore, rename/edit (dan aksi relevan lainnya sesuai audit event yang ada).
- Tidak memakai data dummy/static/hardcoded.
- Menggunakan data real (endpoint backend jika tersedia; jika belum tersedia, catat sebagai kebutuhan backend terpisah).

## Activity Log (Admin/Audit)

Activity Log adalah halaman audit/admin.

Expected behavior:
- Menampilkan log teknis/admin.
- Bisa menampilkan semua aktivitas semua user **jika role admin**.
- Tetap memakai halaman/komponen audit (misalnya ActivityLogPage yang sudah ada saat ini) sebagai fondasi admin/audit.
- Bukan halaman utama untuk user biasa.

## Routing Direction

Arah final yang direkomendasikan (konseptual):

- Menu Activity user memakai route yang terpisah dari audit, misalnya `/activity` atau `/activity-feed` (pilih yang paling aman setelah inspeksi implementasi saat ini).
- Menu Activity Log admin memakai route terpisah, misalnya `/activity-log` atau route yang sudah ada saat ini.
- Jangan menyamakan Activity user dengan ActivityLogPage admin untuk final design.

## Backend Finding

* Existing `GET /activity-logs` is user-scoped.
* It returns activity logs only for the authenticated user (`where user_id = current user`).
* This endpoint is suitable as the first data source for user-facing Activity.
* It is not yet suitable for admin Activity Log global/all-users, because admin cannot currently fetch logs across all users.
* There is no `if admin` logic in `ActivityLogController`.
* There are no query params like `user_id`, `all`, `admin`, or `scope`.
* Admin middleware exists and is registered, but `/activity-logs` does not use admin middleware.
* Admin/global activity log should be handled as a later backend task.

## Current Technical Concern (dicatat untuk implementasi berikutnya)

Pada implementasi saat ini, ada indikasi bahwa:
- `/activity-feed` dan `/activity` sama-sama diarahkan ke halaman audit (ActivityLogPage).

Catatan penting:
- Ini bertentangan dengan konsep final yang membutuhkan Activity user yang terpisah dari Activity Log admin.

## Files Likely Affected Later (untuk implementasi berikutnya)

- `frontend/src/app/App.tsx`
- `frontend/src/app/components/Sidebar.tsx`
- `frontend/src/app/pages/Activity.tsx`
- `frontend/src/pages/ActivityLogPage.tsx`
- kemungkinan service/data fetching terkait activity user-specific vs audit log
- kemungkinan backend activity log endpoint yang perlu disesuaikan untuk user-specific activity

## Implementation Principle

Jangan langsung coding besar. Implementasi harus dilakukan step kecil:

1. Inspeksi routing/menu dan admin guard.
2. Tentukan route final yang benar-benar memisahkan Activity user vs Activity Log admin.
3. Pulihkan Activity user sebagai halaman terpisah dari audit log admin.
4. Ganti data dummy Activity user dengan data real.
5. Rapikan UI Activity user sesuai desain Figma.
6. Pastikan Activity Log tetap admin-only (atau admin-capable) sesuai requirement.


# OpenSpec Change Proposal

## Change ID
merge-activity-feed-into-activity-log

## Problem
Saat ini aplikasi memiliki **dua halaman aktivitas** dengan sumber data berbeda:
- **Activity Feed** (`/activity-feed`) menampilkan data **dummy/static** dari `frontend/src/app/pages/Activity.tsx`.
- **Activity Log** (`/activity`) menampilkan data **real** dari backend melalui `frontend/src/pages/ActivityLogPage.tsx` dan endpoint `/api/activity-logs`.

Akibatnya pengguna mengalami inkonsistensi: halaman “Activity” tampil dengan data berbeda dan perilaku “delete” juga berbeda (dummy memakai `localStorage` key sendiri).

## Goal
Menyatukan pengalaman **Activity Feed** agar menjadi **single source of truth** dan menampilkan data yang sama seperti Activity Log, yaitu **menggunakan `ActivityLogPage` (backend real)**.

## Scope
Perubahan hanya pada alias/route/UI layer agar:
- **`/activity-feed` memakai komponen `ActivityLogPage`**, sama seperti `/activity`.
- **`/activity` tetap memakai `ActivityLogPage`**.

Prinsip: perubahan dilakukan minimal dan tidak mengubah implementasi `ActivityLogPage` maupun fitur backend.

## Out of Scope
- Tidak mengubah backend API (`/api/activity-logs`) maupun logic backend.
- Tidak menghapus file `frontend/src/app/pages/Activity.tsx` (legacy tetap ada).
- Tidak melakukan refactor besar atau perubahan arsitektur routing.

## Risks
Jika perubahan dilakukan sembarangan:
- **Route mismatch**: `/activity-feed` bisa tetap merender `Activity.tsx` dummy sehingga masalah tidak terselesaikan.
- **Highlight sidebar**: karena sidebar menggunakan mapping `activePage`, label/active state bisa tidak sesuai harapan.
- **Legacy dummy masih ada**: `Activity.tsx` tetap ada sehingga perlu dipastikan tidak dirender untuk route yang dimaksud.


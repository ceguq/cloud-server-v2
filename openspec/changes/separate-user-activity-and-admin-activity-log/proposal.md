# Proposal: separate-user-activity-and-admin-activity-log

## Problem

Saat ini konsep **Activity** dan **Activity Log** sempat disatukan melalui change `merge-activity-feed-into-activity-log`. Setelah dicek ulang dengan desain Figma, keputusan tersebut kurang tepat karena **Activity** dan **Activity Log** memiliki target pengguna dan karakter data yang berbeda.

**Activity** harus menjadi halaman user-facing yang modern (timeline/card modern), sedangkan **Activity Log** adalah halaman audit/admin yang lebih teknis.

Koreksi konsep penting:
- **Activity dan Activity Log BUKAN fitur yang sama**.

## Goal

Pisahkan kembali konsep:

- **Activity** untuk user biasa.
- **Activity Log** untuk admin/audit.

Kebutuhan utama:
- Activity user tidak boleh memakai data dummy/static/hardcoded.
- Activity user harus memakai data real milik user saat ini.
- Activity user harus mengikuti gaya UI Figma.
- Activity Log tetap dipertahankan sebagai halaman audit/admin.

## Scope

Fokus pada dokumen arah dan definisi ulang konsep:

- Definisi ulang tanggung jawab halaman **Activity** (user-facing).
- Definisi ulang tanggung jawab halaman **Activity Log** (audit/admin).
- Definisi ulang arah route/menu (agar tidak membingungkan).
- Menentukan kebutuhan data real untuk Activity user.
- Mencatat evaluasi teknis yang diperlukan pada tahap implementasi nanti (tanpa coding).

## Out of Scope

- Tidak langsung menghapus Activity.tsx.
- Tidak langsung menghapus OpenSpec lama.
- Tidak langsung mengubah backend sebelum kebutuhan API jelas.
- Tidak refactor besar.
- Tidak mengubah fitur lain di luar scope (My Files, Shared, Uploads, Trash, Admin Users, Storage).

## Supersedes / Correction

Change ini mengoreksi arah dari:
`openspec/changes/merge-activity-feed-into-activity-log/`

OpenSpec lama **tidak dihapus**, namun **tidak boleh dijadikan acuan final** untuk konsep produk Activity vs Activity Log.

## Risks

- Route bisa bentrok antara Activity dan Activity Log.
- User biasa bisa melihat halaman audit admin jika guard salah.
- Activity bisa kembali menggunakan dummy/static jika sumber data belum diperjelas.
- Backend mungkin belum punya endpoint yang ideal untuk activity user-specific.
- UI Activity bisa tidak sesuai Figma jika memakai komponen/behavior Activity Log admin secara langsung.


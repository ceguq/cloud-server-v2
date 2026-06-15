# OpenSpec Proposal — Implement Real Server Monitor (Stepwise, Anti-Hallucination)

## Problem
Server Monitor saat ini masih placeholder/dummy/random/static sehingga dapat menyesatkan user (contoh: metrik CPU/RAM/disk, hostname/IP, services, alerts ditampilkan sebagai data hardcoded/acak).

## Goal
Menjadikan Server Monitor memakai backend API real secara bertahap (mulai dari endpoint read-only), sehingga UI menampilkan metrik dan status yang benar dari sistem server.

## Non-goals
Dalam step dokumentasi ini, scope dibatasi agar tidak merusak fitur yang sudah berjalan.
- Tidak mengubah Activity Feed, Activity Log, My Files, Shared, Uploads, Trash, Settings, Devices, Dashboard, auth, role system, atau deployment.
- Tidak membuat monitoring real-time WebSocket.
- Tidak membuat database monitoring history dulu.
- Tidak menjalankan command (terminal) selama proses pengembangan pada langkah berikutnya.

## Source of truth (wajib)
- Semua keputusan harus berdasarkan file repo yang dibaca/tersedia.
- Status item harus memakai label: `CONFIRMED`, `NOT FOUND`, `PLANNED`, atau `ASSUMPTION`.

## Status awal yang terkonfirmasi dari kode
- **ServerMonitor UI placeholder**: `CONFIRMED` — halaman `frontend/src/app/pages/ServerMonitor.tsx` menghasilkan data metrik via `Math.random()`/hardcoded arrays dan menampilkan info server hardcoded.
  - Sumber: `frontend/src/app/pages/ServerMonitor.tsx`
- **Routing backend untuk server-monitor belum ada (indikasi)**: `NOT FOUND` belum bisa dipastikan sampai audit route dilakukan secara eksplisit (tapi sementara ini tidak ada endpoint `/api/server-monitor` di dokumen struktur).

> Catatan anti-hallucination: karena pencarian `rg` gagal di environment saat ini, status endpoint/controller belum dapat dinyatakan `CONFIRMED`/`NOT FOUND` secara menyeluruh via tool search. Pada Step 1 berikutnya, AI wajib membaca `backend/routes/api.php` dan file terkait secara manual untuk memastikan.

## Anti-hallucination rules (wajib)
1. AI tidak boleh mengklaim endpoint/controller/service sudah ada tanpa path file yang jelas.
2. AI tidak boleh menyebut fitur “sudah selesai” tanpa bukti dari file kode yang relevan (minimal: route + controller + service + integrasi frontend yang benar untuk data utama).
3. AI wajib menyebut path file saat menyarankan perubahan.
4. AI wajib mengerjakan satu step kecil per prompt (mis. hanya Step 1: audit read-only).
5. AI wajib bertanya jika status kode tidak jelas (mis. endpoint belum ditemukan atau ditemukan tetapi tidak jelas auth/middleware).

## Planned incremental approach (konsep)
Stepwise dimulai dari backend read-only API, kemudian frontend konsumsi, lalu perbaikan error/loading/empty state.

- Step 1: Audit kode aktual Server Monitor (read-only) + audit route/backend untuk endpoint yang ada.
- Step 2: Implement backend controller read-only untuk `GET /api/server-monitor`.
- Step 3: Tambahkan route auth-protected di `backend/routes/api.php`.
- Step 4: Buat frontend service `frontend/src/services/serverMonitorService.ts`.
- Step 5: Ubah `frontend/src/app/pages/ServerMonitor.tsx` agar memakai fetch API dan menggantikan random/dummy untuk metrik utama.


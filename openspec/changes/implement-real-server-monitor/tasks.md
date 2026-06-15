# OpenSpec Tasks — Implement Real Server Monitor (Bertahap)

## Checklist task bertahap
- [x] Step 1: Audit kode aktual Server Monitor read-only.
- [x] Step 2: Audit backend routes/api.php untuk memastikan apakah ada endpoint monitoring yang sudah ada.
- [x] Step 3: Buat backend controller read-only untuk `/api/server-monitor`.
- [x] Step 4: Tambahkan route auth-protected di `backend/routes/api.php`.
- [x] Step 5: Buat frontend service `frontend/src/services/serverMonitorService.ts`.
- [x] Step 6: Ubah `frontend/src/app/pages/ServerMonitor.tsx` agar fetch API dan tidak memakai random/dummy untuk metric utama.
- [x] Step 7: Tambahkan loading/error/empty state.
- [x] Step 8: Manual test oleh user, bukan AI extension.

- [x] Step 9: Update PROJECT_STRUCTURE setelah fitur benar-benar berjalan.


> Catatan: Checklist mengikuti aturan “satu step kecil per prompt” pada iterasi berikutnya.

## Definition of Done

- Endpoint real ada dan path route jelas.

- Controller real ada dan tidak expose data sensitif.
- Frontend service ada dan dipakai oleh page.
- `ServerMonitor.tsx` tidak lagi memakai random/dummy untuk CPU/RAM/disk utama.
- Error handling ada.
- Manual test sudah dilakukan oleh user.
- Dokumentasi status diperbarui setelah terbukti.

## AI Guardrail untuk prompt berikutnya (wajib)
- Sebelum mengubah kode, AI harus membaca OpenSpec ini.
- AI harus hanya mengambil 1 task checklist per prompt.
- AI tidak boleh loncat ke step berikutnya sebelum user bilang selesai.
- AI tidak boleh menjalankan terminal atau command.
- AI harus menyebut semua path file yang akan diubah.
- AI harus membedakan `CONFIRMED`, `NOT FOUND`, `PLANNED`, dan `ASSUMPTION`.

## Batas perubahan file (aturan proyek)
- Pada implementasi berikutnya, perubahan kode hanya boleh dilakukan di: `openspec/changes/implement-real-server-monitor/`.
- Dokumen ini hanya rencana/spec, bukan implementasi.


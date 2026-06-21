## Checklist implementasi (frontend-only)

1. [ ] Tambahkan preview state di `GDrive.tsx` (modal inline, loading/error, target file, blob URL).
2. [ ] Tambahkan helper `canPreviewGDriveFile` / `getPreviewKind` untuk mapping berdasarkan `mime` + extension/name (sesuai scope tipe yang direncanakan).
3. [ ] Tambahkan service helper atau fetch blob preview memakai existing download proxy jika perlu (reuse `GET /api/gdrive/accounts/{account}/files/{fileId}/download`, tapi untuk preview perlu blob tanpa memaksa download).
4. [ ] Tambahkan action **Preview** pada dropdown `⋯` (jangan mengubah behavior Open/Details/Download/Copy).
5. [ ] Tambahkan preview modal inline untuk:
   - [ ] image (img)
   - [ ] PDF (iframe/object)
   - [ ] video (video tag)
   - [ ] audio (audio tag)
   - [ ] text/code kecil (render sebagai pre/code text)
6. [ ] Tambahkan cleanup `blob URL` saat modal close dan/atau saat target preview berubah (`revokeObjectURL`).
7. [ ] Pastikan Open/Details/Download/Copy tetap tidak berubah (UI dan handler existing tidak di-break).
8. [ ] Test build manual oleh user:
   - Cek preview berfungsi untuk tipe yang didukung.
   - Cek unsupported menampilkan “Preview not available” dan tetap bisa Open/Download/Export.
   - Cek tidak ada memory leak yang terlihat (revoke berjalan) dan modal close aman.


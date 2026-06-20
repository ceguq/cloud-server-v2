# OpenSpec Tasks: Google Drive Workspace Export

> Checklist ini adalah rencana implementasi. Dokumen ini tidak mengubah code.

1. Audit current download flow
   - Pastikan `frontend/src/services/gdriveService.ts` memanggil endpoint download proxy yang sama.
   - Pastikan backend saat ini menolak Workspace export dengan 422.

2. Add workspace MIME detection
   - Deteksi `mime_type` file apakah termasuk:
     - `application/vnd.google-apps.document`
     - `application/vnd.google-apps.spreadsheet`
     - `application/vnd.google-apps.presentation`
     - `application/vnd.google-apps.drawing`

3. Add export format mapping
   - Tentukan mapping default:
     - Docs → PDF
     - Sheets → XLSX (fallback PDF jika perlu)
     - Slides → PDF (opsional PPTX jika fallback)
     - Drawings → PNG (fallback PDF)

4. Implement backend export download path
   - Di service yang menangani `download`:
     - jika Workspace mime type → panggil Google Drive `export` endpoint
     - stream hasil ke client dengan header:
       - `Content-Type`
       - `Content-Disposition` (filename + extension)

5. Keep binary download unchanged
   - Untuk file non-Workspace: tetap gunakan mekanisme `alt=media` yang ada.

6. Verify frontend Download button still uses same service
   - Konfirmasi tombol Download di `GDrive.tsx` tetap memanggil service download yang sama.

7. Test Docs/Sheets/Slides export
   - Uji minimal:
     - 1 file Docs → pastikan terdownload sebagai PDF atau format default.
     - 1 file Sheets → pastikan terdownload sebagai XLSX atau fallback PDF.
     - 1 file Slides → pastikan terdownload sebagai PDF.
     - (Opsional) Drawings → PNG/PDF sesuai default/fallback.

8. Confirm no OAuth scope change
   - Pastikan tidak ada perubahan scope.
   - Tetap read-only `https://www.googleapis.com/auth/drive.readonly`.

9. Confirm no write endpoint added
   - Pastikan fitur export hanya read-only.
   - Tidak menambah endpoint write/permission/upload/rename/delete/move.


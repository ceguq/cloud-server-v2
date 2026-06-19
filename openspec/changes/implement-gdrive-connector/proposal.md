# Implement GDrive Connector (Multi-Account) — Proposal

## Tujuan Fitur
Menghubungkan **banyak akun Google Drive** ke masing-masing user di **NimbusDrive V2**, sehingga user dapat:
- melakukan koneksi akun Drive melalui OAuth,
- melihat daftar akun yang terhubung,
- menelusuri file yang berasal dari **semua akun** atau dari **akun tertentu**,
- melihat ringkasan storage per akun,
- memutuskan koneksi (disconnect/revoke).

## Fitur Awal (MVP)

1. **Connect akun Google Drive via OAuth**
   - User memulai koneksi dari UI.
   - Backend melakukan redirect ke Google consent.

2. **Simpan akun terhubung**
   - Hasil pertukaran OAuth (token) disimpan di backend.

3. **Refresh access token otomatis**
   - Menggunakan **refresh token** untuk memperbarui access token saat mendekati/masa berakhir.

4. **List akun terhubung**
   - Backend menyediakan daftar akun Drive yang sudah terhubung oleh user.

5. **List file (Read-only)**
   - Menampilkan file dari:
     - semua akun terhubung (aggregate), atau
     - per akun tertentu.

6. **Tampilkan storage usage per akun**
   - Ambil metrik storage dari Google Drive dan tampilkan per akun.

7. **Disconnect / Revoke akun**
   - Putus koneksi dengan cara revoke akses dan menandai akun sebagai revoked.

## Security & Token Handling (Wajib)
- **Token hanya disimpan di backend**.
- **Tidak ada access token / refresh token yang dikirim ke frontend**.
- Frontend hanya menerima status koneksi (mis. `connected: true/false`) dan data non-sensitif.

## Batasan Awal
- **Fase awal adalah read-only**.
  - Tidak ada operasi tulis (upload, delete, overwrite, rename, move) ke Google Drive.
  - Endpoint yang disediakan untuk MVP hanya membaca (list accounts, list files, storage usage).


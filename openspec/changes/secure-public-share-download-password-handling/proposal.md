# Secure public-share download password handling

## Ringkasan
Change ini memperbaiki alur download untuk public share yang dilindungi password dengan menghilangkan penggunaan password di URL query string.

## Tujuan
- Hindari ekspos password share dalam URL ketika pengguna klik Download.
- Tetap pertahankan public share metadata via `GET /api/share/{token}`.
- Tetap pertahankan `GET /api/share/{token}/download` untuk shares yang tidak dilindungi password.
- Tambah `POST /api/share/{token}/download` untuk protected downloads.
- Pastikan protected password dikirim di badan request, bukan di URL.

## Batasan
- Tidak mengubah model otentikasi: public share tetap tidak terlindungi oleh login.
- Tidak menambahkan sesi, token sementara, atau database migration.
- Tidak merombak seluruh mekanik public share.
- Tidak menyimpan password di localStorage/sessionStorage/log.

## Outcome yang diharapkan
- Password-protected download tidak lagi muncul di URL.
- Protected download menggunakan body POST untuk password.
- Unprotected download tetap bekerja menggunakan GET bila memungkinkan.
- Backend tetap mengembalikan binary download dengan Content-Disposition.
- Kesalahan password/expired/invalid tetap tampil seperti sekarang.

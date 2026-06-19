# Add GDrive UI (UI-only, Dummy Data)

## Ringkasan
Fitur ini menambahkan halaman baru **Google Drive / GDrive** pada NimbusDrive V2 berupa **UI-only** (placeholder) dengan **data dummy lokal**.

## Tujuan
- Menyediakan pengalaman UI “Google Drive” yang familiar: panel akun, storage overview per akun, tab file (All/Starred/Shared/Recent), search, dan toggle list/grid.
- Mengintegrasikan menu baru **GDrive** ke sidebar dan routing ke `/gdrive`.

## Batasan (Wajib)
- **Tidak** mengimplementasikan Google OAuth atau Google Drive API.
- **Tidak** memanggil backend/service baru.
- Interaksi utama hanya untuk UI (dummy state).

## Outcome yang diharapkan
- Sidebar menampilkan item **GDrive**.
- Klik GDrive membuka route `/gdrive`.
- Halaman menampilkan akun dummy dan file dummy.


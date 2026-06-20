# OpenSpec: Implement Google Drive File Management (NimbusDrive)

## Problem
NimbusDrive V2 saat ini sudah menyediakan integrasi awal Google Drive (connector) yang fokus pada **read-only**: list akun dan list file. Namun belum ada desain yang jelas untuk **pengelolaan file Google Drive secara lebih lengkap** dari sisi UI/UX: membuka file di tab baru, melakukan download melalui backend proxy, serta menampilkan metadata/previews di UI.

Saat nantinya fitur write (rename/delete/upload/move) ditambahkan, diperlukan desain OAuth scope yang berbeda dan strategi keamanan token yang aman.

## Goal
Menyediakan fitur “Google Drive file management” untuk NimbusDrive, dimulai dari fase read-only:

### Fase awal (Read-only management)
1. **Open file Google Drive** di **tab baru**.
2. **Download file Google Drive** melalui **backend proxy** (agar token tidak bocor ke frontend).
3. **Preview metadata / file info** di UI.

### Fase lanjutan (Write management)
(Direncanakan sebagai tahap berikutnya; tidak diimplementasikan sekarang)
- rename file
- delete/trash file
- upload file ke Google Drive
- move file/folder

## Non-goals
- Tidak mengubah backend/frontend sekarang (OpenSpec ini hanya dokumen desain).
- Tidak mengimplementasikan fitur write pada fase awal.
- Tidak mengelola permission detail multi-user di Google Drive (mis. ACL fine-grained) pada dokumen ini.
- Tidak mengubah mekanisme OAuth connector yang sudah ada, kecuali penyesuaian scope yang akan berdampak pada reconnect/consent ulang.

## Scope fase awal dan fase lanjutan
### Scope fase awal (Read-only)
- Read-only OAuth tetap: `https://www.googleapis.com/auth/drive.readonly`.
- Fitur yang termasuk:
  - open file (tab baru)
  - download via backend proxy
  - preview metadata/file info di UI

### Scope fase lanjutan (Write)
- Setelah write fitur diaktifkan, dibutuhkan OAuth scope tambahan, kemungkinan:
  - `https://www.googleapis.com/auth/drive`
  - atau scope spesifik lain yang sesuai dengan kebutuhan write operation.

### Dampak perubahan scope
- Perubahan scope akan menyebabkan user perlu **reconnect/consent ulang**.
- Fitur write harus gated berdasarkan scope/status koneksi saat ini (agar tidak gagal saat scope belum diizinkan).


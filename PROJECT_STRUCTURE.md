# NimbusDrive V2 - Project Structure & Code Audit

Dokumen ini adalah audit struktur project, status fitur, dan risiko kode berdasarkan kondisi repository pada 2026-07-10.

## 1. Ringkasan Project

| Item | Kondisi Saat Ini |
| --- | --- |
| Nama project | NimbusDrive V2 |
| Jenis aplikasi | Cloud storage / file manager berbasis web |
| Frontend | React 18.3.1, TypeScript strict, Vite 6.3.5, Tailwind CSS 4, Radix/shadcn style components, lucide-react, MUI icons, Recharts, Axios |
| Backend | Laravel framework ^13.8, PHP ^8.3, Laravel Sanctum, PHPUnit 12 |
| Auth | Email/password login, Sanctum bearer token, role `admin` / `user` |
| Storage lokal | Laravel local disk, metadata file di database, soft delete untuk file dan folder |
| Integrasi eksternal | Google Drive OAuth + Drive API via manual HTTP service |
| Dokumentasi workflow | Banyak proposal OpenSpec tersimpan di `openspec/changes` |
| Status umum | Core file manager lokal aktif, Google Drive sudah jauh melewati skeleton, beberapa fitur masih read-only/local-only |

## 2. Snapshot Audit

Audit dilakukan dengan membaca struktur file, route backend, controller/service/model/migration, service frontend, halaman utama, konfigurasi, dependency, dan test skeleton. Statistik ini mengecualikan `vendor`, `node_modules`, `.git`, lock file besar, dan asset binary.

| Ekstensi | Jumlah file | Lines |
| --- | ---: | ---: |
| `.php` | 63 | 6,422 |
| `.tsx` | 120 | 26,790 |
| `.ts` | 37 | 1,839 |
| `.css` | 6 | 210 |
| `.js` | 2 | 24 |
| `.json` | 5 | 216 |
| `.md` | 95 | 6,653 |

File terbesar dan area paling berisiko maintainability:

| File | Lines | Catatan |
| --- | ---: | --- |
| `frontend/src/app/pages/MyFiles.tsx` | 4,830 | File manager utama; sebagian UI/helper sudah diekstrak ke `my-files/` |
| `frontend/src/app/pages/GDrive.tsx` | 4,103 | UI Google Drive besar; beberapa formatter/state component sudah diekstrak ke `gdrive/` |
| `frontend/src/pages/ActivityLogPage.tsx` | 1,312 | Admin activity log dengan filter, pagination, local hide/delete |
| `frontend/src/app/pages/Trash.tsx` | 1,296 | Restore dan permanent delete lokal |
| `frontend/src/app/pages/Dashboard.tsx` | 1,244 | Banyak fetch dashboard real-time |
| `backend/app/Http/Controllers/GDriveController.php` | 886 | Controller Google Drive besar |
| `frontend/src/app/pages/Activity.tsx` | 860 | User activity feed dari backend logs |
| `frontend/src/app/pages/Shared.tsx` | 856 | Share link management |
| `frontend/src/app/pages/ServerMonitor.tsx` | 828 | Current server metrics UI |
| `backend/app/Services/GoogleDriveService.php` | 462 | Manual Google Drive HTTP integration |
| `backend/app/Http/Controllers/FileController.php` | 461 | File CRUD/upload/download/preview |

## 3. Struktur Root

```text
CLOUD_SERVER_V2/
|-- backend/
|   |-- app/
|   |   |-- Http/
|   |   |   |-- Controllers/
|   |   |   |   |-- Admin/UserController.php
|   |   |   |   |-- ActivityLogController.php
|   |   |   |   |-- AuthController.php
|   |   |   |   |-- DeviceController.php
|   |   |   |   |-- FileController.php
|   |   |   |   |-- FolderController.php
|   |   |   |   |-- GDriveController.php
|   |   |   |   |-- ServerMonitorController.php
|   |   |   |   |-- ShareController.php
|   |   |   |   |-- StorageController.php
|   |   |   |   `-- TrashController.php
|   |   |   `-- Middleware/EnsureUserIsAdmin.php
|   |   |-- Models/
|   |   `-- Services/
|   |-- config/
|   |-- database/
|   |   |-- factories/
|   |   |-- migrations/
|   |   `-- seeders/
|   |-- routes/
|   |   |-- api.php
|   |   |-- console.php
|   |   `-- web.php
|   |-- tests/
|   |-- composer.json
|   `-- phpunit.xml
|-- frontend/
|   |-- src/
|   |   |-- app/
|   |   |   |-- App.tsx
|   |   |   |-- components/
|   |   |   |-- pages/
|   |   |   |   |-- MyFiles.tsx
|   |   |   |   |-- GDrive.tsx
|   |   |   |   |-- Dashboard.tsx
|   |   |   |   |-- ...
|   |   |   |   |-- activity/
|   |   |   |   |-- admin-users/
|   |   |   |   |-- dashboard/
|   |   |   |   |-- devices/
|   |   |   |   |-- gdrive/
|   |   |   |   |-- login/
|   |   |   |   |-- my-files/
|   |   |   |   |-- public-share/
|   |   |   |   |-- server-monitor/
|   |   |   |   |-- settings/
|   |   |   |   |-- shared/
|   |   |   |   |-- trash/
|   |   |   |   `-- uploads/
|   |   |   `-- upload/
|   |   |-- pages/
|   |   |-- services/
|   |   |-- styles/
|   |   |-- types/
|   |   `-- main.tsx
|   |-- package.json
|   |-- tsconfig.json
|   `-- vite.config.ts
|-- openspec/
|   `-- changes/
|-- PROJECT_STRUCTURE.md
|-- TODO.md
`-- UPLOAD_LIMIT_FIX.md
```

## 4. Backend Audit

### 4.1 Route Surface

Semua API utama berada di `backend/routes/api.php`.

| Area | Endpoint | Status | Catatan |
| --- | --- | --- | --- |
| Health | `GET /ping` | Aktif | JSON ping API |
| Auth public | `POST /auth/login` | Aktif | Membuat Sanctum token, log `auth.login` |
| Auth protected | `GET /auth/me`, `POST /auth/logout`, `PATCH /profile` | Aktif | Logout menghapus current token; `PATCH /profile` updates the authenticated user's `name` only (trimmed, validated server-side) |
| Public share | `GET /share/{token}`, `GET /share/{token}/download`, `POST /share/{token}/download` | Aktif | Tanpa auth, cache-control no-store |
| Admin users | `GET /admin/users` | Aktif | Admin middleware |
| Activity logs | `GET /activity-logs`, `GET /admin/activity-logs` | Aktif | User scope dan admin global |
| Folders | `GET/POST/PATCH/DELETE /folders`, `PATCH /folders/{folder}/move` | Aktif, caveat multi-user | Recursive delete/restore/force-delete ownership validation sekarang hardened untuk seluruh subtree dan diuji; folder belum punya `user_id` |
| Files | `GET /files`, `POST /files/upload`, `GET /files/recent`, `PATCH/DELETE /files/{file}`, download, preview, move, cancel upload | Aktif | File di-scope ke user |
| Duplicates | `GET /files/duplicates` | Aktif | Group by `original_name` + `size` |
| Share links protected | `GET /share-links`, `POST /files/{file}/share`, `DELETE /share-links/{shareLink}` | Aktif | Password field belum aman/terpakai |
| Storage | `GET /storage`, `GET /storage/breakdown` | Aktif | Quota 100 GB enforced pada upload lokal sebelum disk write; upload exact-limit diizinkan dan over-limit ditolak dengan 422 |
| Server monitor | `GET /server-monitor` | Aktif | Read-only system metrics |
| Devices | `GET /devices`, `PATCH /devices/{device}`, `DELETE /devices/{device}`, `PATCH /devices/{device}/trusted` | Aktif | User-scoped; semua write route memerlukan device milik user yang sama dan device milik user lain mengembalikan 404; login sukses otomatis create/update device best-effort, repeat same-browser login update row yang sama, Chrome/Brave dibedakan, `trusted` existing dipertahankan |
| Local trash files/folders | `GET`, `POST restore`, `DELETE force` | Aktif, caveat folder global | File scoped user, folder belum scoped user |
| Google Drive accounts/files | OAuth connect/callback, list accounts/files, account files | Aktif | OAuth state encrypted, token encrypted |
| Google Drive actions | download, trash, restore, visibility, rename, permanent delete, create folder, upload | Aktif, config-dependent | Scope `.env.example` sekarang dokumentasikan broad Drive scope; insufficient-scope mutation gagal mengembalikan 403 terstruktur dengan reconnect contract, dan akun lama yang pernah di-authorize readonly bisa perlu reconnect/re-consent |

### 4.2 Controller dan Service

| File | Fungsi | Status audit |
| --- | --- | --- |
| `AuthController.php` | Login, Sanctum token, me, logout, login activity log, automatic device create/update on successful login | Aktif; device tracking best-effort dan tidak memblokir login |
| ProfileUpdateTest | Backend feature tests for profile update | `ProfileUpdateTest`: 10 tests, 32 assertions |
| `FileController.php` | Duplicate finder, list/search, upload, cancel upload, download, preview, rename, trash, move, recent files | Aktif; upload tetap memakai validasi 1 GB per file, menambahkan pre-write user-scoped quota enforcement, dan mengembalikan 422 validation-style saat over quota |
| `FolderController.php` | List/search, create, rename/update, recursive trash, move with descendant guard | Aktif, tapi global folder |
| `ShareController.php` | Share link list/create/delete/public show/download | Aktif, password gap |
| `TrashController.php` | File/folder restore dan force delete recursive | Aktif, folder global |
| `StorageController.php` | Usage info dan category breakdown | Aktif; usage/reporting real dan quota 100 GB enforced pada upload lokal (exact-limit allowed, over-limit rejected sebelum disk write, dan usage scoped ke user terautentikasi) |
| `ActivityLogController.php` | User/admin paginated logs with action filter | Aktif |
| `Admin/UserController.php` | Read-only user list | Aktif |
| `DeviceController.php` | List devices, rename `display_name`, delete device record, trust/untrust, safe response serialization, ownership enforcement | Aktif; tidak expose `device_hash`/full `user_agent` |
| `ServerMonitorController.php` | OS, CPU, memory, disk, network, service status | Aktif |
| `GDriveController.php` | OAuth, accounts, list, trash, rename, visibility, download, upload | Aktif, besar | Insufficient-scope mutation failures sekarang mengembalikan 403 terstruktur dengan reconnect contract untuk upload/rename/trash/restore/visibility/create-folder/permanent-delete |
| `ActivityLogService.php` | Safe best-effort logging, metadata sanitization | Aktif |
| `GoogleDriveService.php` | Token exchange/refresh, Drive list/download/export/upload/mutate | Aktif; upload sekarang memakai streamed multipart via `fopen(..., 'rb')` + Guzzle PSR-7 `AppendStream`, dan ada `GDriveUploadStreamingTest` (1 test, 4 assertions) yang menguji body stream |

### 4.3 Model dan Database

| Model/table | Isi utama | Catatan audit |
| --- | --- | --- |
| `users` / `User` | `name`, `email`, hashed `password`, `role` | Role helper `isAdmin()` dan `isUser()` |
| `folders` / `Folder` | UUID, `name`, `parent_id`, timestamps, soft deletes | Tidak ada `user_id`; ini risiko multi-user terbesar |
| `files` / `File` | UUID, `user_id`, `folder_id`, original/stored/path/mime/size, soft deletes | File ownership enforced di controller |
| `share_links` / `ShareLink` | UUID, `file_id`, token, expires, password, download count | Password divalidasi saat public access; protected download POST support active |
| `activity_logs` / `ActivityLog` | UUID, user/action/description/subject/metadata/ip/user_agent | Metadata disanitasi di service |
| `devices` / `Device` | UUID, user/device/browser/ip/trusted/last_seen | Otomatis tercatat saat login sukses; fingerprint memakai user, normalized User-Agent, dan browser identity; update `last_seen_at`, IP, browser, platform, device info; `trusted` existing dipertahankan |
| `gdrive_accounts` / `GDriveAccount` | UUID, user, email/account id, encrypted tokens, scopes, timestamps, revoked_at | Token terenkripsi via casts |

Live SQLite ownership audit (2026-07-11): total folders 5; null-owned folders 0; invalid owner references 0; parent/child owner conflicts 0; mixed-owner folders 0; ambiguous folders 0; no backfill required now; non-null enforcement remains deferred as optional safety work.

### 4.4 Konfigurasi Backend

| File | Catatan |
| --- | --- |
| `backend/bootstrap/app.php` | API exception forced JSON, middleware alias `admin` |
| `backend/config/cors.php` | Origin dibaca dari `CORS_ALLOWED_ORIGINS`; default `.env.example` untuk localhost |
| `backend/config/services.php` | Google Drive OAuth config dan default scope full `drive` jika env kosong |
| `backend/.env.example` | Google Drive scope sekarang mencatat `https://www.googleapis.com/auth/drive` yang sesuai dengan fitur mutasi; akun yang sebelumnya di-authorize dengan scope readonly bisa tetap perlu reconnect/re-consent |
| `backend/phpunit.xml` | Test sqlite in-memory, suite Unit + Feature |

## 5. Frontend Audit

### 5.1 Aplikasi dan Routing

`frontend/src/app/App.tsx` memakai routing manual berbasis `window.history.pushState`, bukan `react-router`, walaupun dependency `react-router` ada. Public share route dideteksi dari path `/share/`. Setelah login, shell memuat `Sidebar`, `Topbar`, page aktif, dan global `UploadTray`.

Auth token dan user disimpan di `localStorage` sebagai `nimbus_token` dan `nimbus_user`. Axios interceptor di `services/api.ts` memasang `Authorization: Bearer ...`. `VITE_API_BASE_URL` wajib tersedia untuk service utama; `PublicSharePage` dan share URL builder punya fallback sendiri.

### 5.2 Frontend Modularization

Update terbaru memperluas pola modular per page di `frontend/src/app/pages/`. File page induk masih menjadi entry point UI, tetapi formatter, empty/loading/error state, status badge, dan beberapa komponen kecil sudah dipindah ke subfolder per domain. Ini membuat struktur lebih mudah diaudit daripada sebelumnya, walau `MyFiles.tsx` dan `GDrive.tsx` masih menjadi file terbesar.

| Area | File/folder | Fungsi |
| --- | --- | --- |
| My Files | `app/pages/my-files/` | Komponen toolbar/breadcrumb/preview/empty states serta helper filter, formatter, sort, theme, preview, share, menu, DOM |
| Google Drive | `app/pages/gdrive/` | Formatter Drive, inline error/status/loading/empty/no-account components |
| Dashboard | `app/pages/dashboard/` | Formatter dashboard dan stat card component |
| Activity | `app/pages/activity/` | Formatter tanggal, action UI mapping, empty/loading/error states |
| Devices | `app/pages/devices/` | Formatter device dan empty/loading/error states |
| Shared | `app/pages/shared/` | Share formatter dan empty/loading/error states |
| Trash | `app/pages/trash/` | Trash formatter dan empty/loading/error states |
| Server Monitor | `app/pages/server-monitor/` | Formatter metrics dan loading/status components |
| Login/Public Share/Settings/Uploads/Admin Users | Domain subfolders masing-masing | Komponen kecil atau formatter spesifik page |

### 5.3 Page Status

| Page | File | Status | Catatan |
| --- | --- | --- | --- |
| Dashboard | `app/pages/Dashboard.tsx` + `app/pages/dashboard/` | Aktif/partial | Ambil storage, recent files, share links count, devices count, activity logs, server monitor, storage breakdown; manual Refresh reload semua dataset real, menunggu request settle, failure per-widget tidak memblokir yang lain, dan guard duplicate load |
| My Files | `app/pages/MyFiles.tsx` + `app/pages/my-files/` | Aktif | File/folder manager lengkap; helper/komponen kecil mulai modular, state/action utama masih di file induk |
| GDrive | `app/pages/GDrive.tsx` + `app/pages/gdrive/` | Aktif | OAuth accounts, file list, folder navigation, upload, download/preview, trash/restore, rename, visibility, create folder |
| Shared | `app/pages/Shared.tsx` + `app/pages/shared/` | Aktif | List/copy/open/delete share links; error state now includes Retry via existing fetch flow |
| Uploads | `app/pages/Uploads.tsx` + `app/pages/uploads/` | Aktif | Tampilan queue global dari upload manager |
| Devices | `app/pages/Devices.tsx` + `app/pages/devices/` | Aktif | Menarik real user-scoped `/devices`; tracking otomatis dari login sukses; Refresh, Rename, Delete, Trust/Untrust, duplicate-request guard, dan local state update setelah write berhasil |
| Activity | `app/pages/Activity.tsx` + `app/pages/activity/` | Aktif/partial | Menarik backend activity logs, filter/search, hide/delete localStorage only; Export Log available for currently loaded/filtered visible rows (frontend-only) |
| Activity Log | `pages/ActivityLogPage.tsx` | Admin aktif/partial | Admin log global dengan pagination/filter, bulk hide localStorage only |
| Trash | `app/pages/Trash.tsx` + `app/pages/trash/` | Aktif | Local trash files/folders, restore dan force delete |
| Server Monitor | `app/pages/ServerMonitor.tsx` + `app/pages/server-monitor/` | Aktif | Metrics real dari backend, manual Refresh guarded against duplicate requests, Retry tetap aktif; chart historical belum ada |
| Settings | `app/pages/Settings.tsx` + `app/pages/settings/` | Partial | Profile display-name editable and server-persisted; email read-only; Theme/accent disimpan localStorage; other settings (notifications, security, storage, API keys) remain mostly placeholder/local-only |
| Admin Users | `app/pages/AdminUsers.tsx` + `app/pages/admin-users/` | Aktif | Read-only admin user list aktif; bug kolom Name sudah diperbaiki |
| Login | `app/pages/LoginPage.tsx` + `app/pages/login/` | Aktif | Login email/password |
| Public Share | `app/pages/PublicSharePage.tsx` + `app/pages/public-share/` | Aktif | Fetch public share metadata dan download |

Catatan refactor My Files: `frontend/src/app/pages/MyFiles.tsx` telah menyelesaikan fase refactor boundary logika inti dengan ekstraksi helper/hook seperti `myFilesMenuPositioning.ts`, `myFilesSelectionUtils.ts`, `useMyFilesSelection.ts`, `useMyFilesActionMenus.ts`, `myFilesMoveModalUtils.ts`, `myFilesFolderModalUtils.ts`, dan `myFilesDetailsModalUtils.ts`. `MyFiles.tsx` tetap sengaja dipertahankan sebagai page-level orchestrator; logic rename/delete/share/data-loading/preview tetap parent-owned karena lebih terkait async/API/refs/blob/URL lifecycle. Arsip OpenSpec: `openspec/changes/archive/2026-07-06-refactor-myfiles-core-logic-boundaries/`.

### 5.4 Services Frontend

| Service | Fungsi | Catatan |
| --- | --- | --- |
| `api.ts` | Axios instance + bearer interceptor | Tidak ada fallback global bila `VITE_API_BASE_URL` kosong |
| `authService.ts` | login/logout/me/updateProfile() | Aktif (includes `updateProfile()` used by Settings to save display name) |
| `authServices.ts` | Duplikat `authService.ts` | Perlu dibersihkan |
| `fileService.ts` | files CRUD, upload, download, preview helpers | Aktif |
| `folderService.ts` | folders CRUD/move | Aktif |
| `shareService.ts` | share links + public URL helper | Aktif |
| `trashService.ts` | local trash restore/force delete | Aktif |
| `storageService.ts` | storage info | Aktif |
| `storageBreakdownService.ts` | category breakdown | Aktif |
| `activityLogService.ts` | user/admin activity logs | Aktif |
| `adminUserService.ts` | admin users list | Aktif |
| `deviceService.ts` | devices list, rename, delete, trusted toggle | Aktif; `getDevices`, `renameDevice`, `deleteDevice`, dan `setDeviceTrusted` terhubung ke route device user-scoped |
| `serverMonitorService.ts` | server monitor response type + fetch | Aktif |
| `gdriveService.ts` | Google Drive accounts/files/download/blob/trash/restore/visibility/delete/rename/create/upload | Aktif |
| `duplicateFileService.ts` | duplicate file groups | Aktif |
| `recentFileService.ts` | dashboard recent files | Aktif |

### 5.5 Upload Manager

`frontend/src/app/upload/UploadManagerContext.tsx` mengelola queue global dengan status `queued`, `uploading`, `completed`, `failed`, `cancelled`, progress Axios, retry, cancel via `AbortController`, dan callback refresh storage/list. Upload diproses serial per queue. `UploadTray.tsx` menampilkan panel ringkas floating.

Catatan risiko: cancel saat upload sedang berjalan hanya bisa membersihkan file server bila backend file id sudah diketahui; pada upload multipart biasa file id baru tersedia setelah request sukses.

## 6. Status Fitur

| Fitur | Status | Ringkasan |
| --- | --- | --- |
| Login/logout/me | Selesai | Sanctum token auth aktif |
| Role admin/user | Selesai | Backend middleware `admin`; frontend menyesuaikan menu dari localStorage |
| Local file manager | Selesai dengan risiko maintainability | Fitur lengkap; `MyFiles.tsx` sudah modular sebagian tetapi masih sangat besar |
| Folder nesting/move/trash | Partial | Logic aktif dan recursive ownership hardening untuk delete/restore/force-delete sudah teruji; folder belum user-scoped, dan non-null enforcement/backfill tooling tetap deferred |
| Preview file lokal | Selesai | Image/PDF/video/audio/text/code-like extension |
| Share link publik | Partial | Token/expiry/download count aktif; protected downloads now validate passwords and support POST body downloads |
| Storage usage/breakdown | Selesai/partial | Reporting real; 100 GB quota enforced pada upload lokal (exact-limit diizinkan, over-limit ditolak sebelum disk write, dan usage scoped ke user terautentikasi) |
| Activity log | Selesai/partial | Backend log aktif; UI delete hanya local hide |
| Trash local | Selesai/partial | File scoped user, folder global |
| Duplicate finder local | Selesai | By original name + size |
| Devices | Aktif | Device record management aktif; delete hanya menghapus record dari daftar, tidak revoke token atau log browser out; `trusted` hanya label/state NimbusDrive; login sukses berikutnya bisa membuat ulang device record yang dihapus |
| Server monitor | Selesai/partial | Real current metrics, belum time-series history |
| Google Drive connect/list | Selesai | OAuth, account list, file list, per-account navigation |
| Google Drive mutations | Selesai secara kode, config-dependent | Upload/trash/restore/rename/share/delete/create folder sekarang memanfaatkan scope Drive yang sesuai; insufficient-scope failures return 403 reconnect contract dan akun lama yang readonly bisa perlu reconnect/re-consent |
| Settings | Partial | Theme/accent persist; banyak setting lain hardcoded/local UI |
| Admin users | Partial | Read-only list aktif; bug render nama sudah diperbaiki |
| Test coverage | Partial | Focused feature tests cover recursive ownership (`RecursiveFolderOwnershipTest`: 11 tests, 52 assertions), Google Drive scope config (`GDriveScopeConfigTest`: 1 test, 3 assertions), reconnect handling (`GDriveReconnectTest`: 1 test, 5 assertions), dan frontend build passed |

### 5.6 Recent frontend cleanup notes

- **Dashboard:** Uses real dashboard counts/data where available. Manual Refresh reloads current real API datasets, waits for all requests to settle, keeps per-widget failures isolated, and guards duplicate dashboard loads. Misleading fake trend labels and fake Memory/Disk chart history were cleaned up. The Recent Files dead action menu was removed and inactive Dashboard UI elements were cleaned up.

- **Server Monitor:** Manual Refresh uses the existing metrics loader with duplicate-request guard, while existing Retry behavior remains active. Disk usage unavailable state now avoids showing fake 0%/100% pie chart data; the UI shows an unavailable placeholder instead.

- **Devices:** Refresh, Rename, Delete, and Trust/Untrust are now active with confirmation/loading/error states. The page preserves browser/platform/IP/last-seen/trusted display and updates local state after successful writes. Deleting a device record only removes the record from this list; it does not revoke tokens or log the browser out.

- **MyFiles:** Refactor phases completed/archived and post-refactor regressions were fixed where applicable (see openspec archive and recent commits).
- **LoginPage:** registration toggle removed; registration and password recovery are unavailable.
- **Settings:** Profile display-name is now editable and persists server-side (PATCH `/api/profile`), email remains read-only; notifications, security, and storage actions remain neutralized/placeholders; appearance theme and accent remain functional locally. The profile display-name change survives refresh, logout/login, and other devices once the backend has been refreshed via authenticated `/auth/me`.
- **Trash:** initial load retry exists, restore failures are surfaced, selection clears correctly after successful restore/delete and bulk actions, and confirmation copy is consistently English.
- **PublicSharePage:** load-error retry exists; async page load uses a cancellation guard; protected downloads now use POST body blob handling and avoid passwords in the URL.

## 7. Temuan Audit Prioritas

### High

1. Folder belum multi-user safe.
   `folders` tidak punya `user_id`, dan `FolderController`/`TrashController` melakukan query folder global. Dampaknya folder hierarchy, folder trash, restore, dan force delete bisa bercampur antar user bila ada lebih dari satu user.

2. Share link password tidak aman dan tidak dipakai.
   `ShareController::create()` menerima `password` lalu menyimpan langsung ke kolom `password`, tetapi public `show()` dan `download()` tidak meminta/memvalidasi password. Jika fitur password ingin dipertahankan, password harus di-hash dan public endpoint harus melakukan challenge/validation.

3. Scope Google Drive di `.env.example` sekarang sudah disinkronkan dengan fitur mutasi.
   `.env.example` kini memakai `https://www.googleapis.com/auth/drive`, tetapi akun yang sebelumnya di-authorize dengan scope readonly bisa tetap perlu reconnect/re-consent karena token lama tidak otomatis diperbarui.

### Medium

4. Test coverage sangat rendah.
   Backend hanya punya example unit/feature tests. Belum ada coverage untuk auth, file ownership, folder recursion, share public access, activity log, GDrive, device, dan server monitor. Frontend belum punya test setup.

5. Komponen/controller terlalu besar.
   Banyak page sudah punya subfolder modular, tetapi file induk masih besar: `MyFiles.tsx` 4,830 line, `GDrive.tsx` 4,103 line, `ActivityLogPage.tsx` 1,312 line, `Trash.tsx` 1,296 line, dan `GDriveController.php` 886 line.

6. Device record management selesai, tetapi revocation/session tidak diimplementasi.
   Record device sudah bisa di-list, rename, delete, dan trust/untrust; namun delete record tidak melakukan revoke token atau remote logout, dan `trusted` tidak dipakai untuk authorization. Login sukses berikutnya bisa membuat ulang record device yang sudah dihapus.

7. Settings masih local-only/hardcoded.
   Banyak field profile/security/storage/API key hanya UI, bukan data user/backend. Theme/accent adalah bagian yang benar-benar persist di localStorage.

8. Duplikasi auth service.
   `frontend/src/services/authService.ts` dan `authServices.ts` berisi implementasi sama. Ini rawan drift.

9. API base URL frontend bergantung env.
    `services/api.ts` tidak punya fallback. Pastikan `frontend/.env` atau `.env.local` berisi `VITE_API_BASE_URL=http://127.0.0.1:8000/api` atau setara.

### Low

11. CORS bergantung konfigurasi env.
    `backend/config/cors.php` membaca `CORS_ALLOWED_ORIGINS`; `.env.example` menyediakan default localhost. Origin deployed/LAN harus dikonfigurasi di `.env` backend sebenarnya.

12. Banyak penggunaan `any` di frontend.
    Sebagian untuk tolerance response dan browser API, tetapi area service/page besar bisa dibuat lebih type-safe.

13. Activity delete di UI bukan delete server.
    `Activity` dan `ActivityLogPage` menyimpan hidden/deleted ids di localStorage. Ini cocok untuk "hide locally", bukan audit log deletion.

14. Google Drive upload memory usage berkurang, tetapi bukan resumable/chunked.
    `GoogleDriveService::uploadFile()` tidak lagi memakai `file_get_contents()` untuk file upload; aliran multipart sekarang dibangun dari file resource dengan `fopen(..., 'rb')` dan Guzzle PSR-7 `AppendStream`, sehingga titik buffering penuh file di PHP memory sudah dihilangkan. Ini memperbaiki memory pressure untuk upload besar, tetapi upload masih bukan resumable/chunked dan batas PHP/web-server tetap berlaku.

15. Quota storage sekarang enforced pada upload lokal.
    Backend menghitung limit 100 GB dan upload dicek sebelum disk write; upload exact-limit diizinkan, over-limit ditolak, dan usage scoped ke user yang terautentikasi. Concurrent uploads masih bisa race karena tidak ada reservation/locking system.

## 8. Development Commands

Backend:

```bash
cd backend
composer install
php artisan migrate
php artisan serve
php artisan test
```

Frontend:

```bash
cd frontend
npm install
npm run dev
npm run build
```

Environment minimum yang penting:

```bash
# frontend/.env atau frontend/.env.local
VITE_API_BASE_URL=http://127.0.0.1:8000/api

# backend/.env
APP_URL=http://127.0.0.1:8000
FRONTEND_URL=http://127.0.0.1:5173
GOOGLE_DRIVE_CLIENT_ID=
GOOGLE_DRIVE_CLIENT_SECRET=
GOOGLE_DRIVE_REDIRECT_URI="${APP_URL}/api/gdrive/callback"
# Jika mutation Google Drive dipakai, jangan readonly.
GOOGLE_DRIVE_SCOPES=https://www.googleapis.com/auth/drive
```

## 9. Rekomendasi Urutan Perbaikan

1. Tambahkan `user_id` ke `folders`, migrasikan data, dan update semua folder query agar user-scoped.
2. Putuskan fitur password share link: hapus field dari API/UI, atau implementasikan hash + validation public endpoint.
3. Sinkronkan Google Drive scope docs/env dengan fitur mutasi dan pertahankan handling scope insufficient yang eksplisit; akun lama yang pernah di-authorize readonly bisa tetap perlu reconnect/re-consent.
4. Tambahkan tests backend untuk auth, ownership, folder recursion, share link, trash, storage quota, dan GDrive happy/error path dengan HTTP fake.
5. Lanjutkan ekstraksi `MyFiles.tsx` dan `GDrive.tsx` ke hook/action modules untuk state, side effect, modal state, dan action handler; subfolder komponen/formatter sudah ada dan bisa menjadi pola.
6. Pertahankan batasan device management saat ini: record device sudah aktif, tetapi revocation token/session dan authorization berbasis `trusted` belum diimplementasi.
7. Hapus `authServices.ts` atau jadikan re-export dari `authService.ts`.
8. Tambahkan fallback atau validasi startup untuk `VITE_API_BASE_URL`.
9. Buat batas quota upload real sebelum file disimpan.
10. Non-null enforcement pada folder ownership dan kemungkinan backfill tooling tetap deferred/opsional; tidak ada backfill live yang diperlakukan sebagai completed.

## 10. Catatan Workspace

This document is based on the current committed code. Local working-tree status should be verified separately with `git status`.

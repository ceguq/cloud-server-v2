# NimbusDrive V2 - Project Structure & Feature Audit

**Dokumen ini berisi audit menyeluruh terhadap struktur project, status fitur, dan kondisi kode asli repository.**

**Update: 2026-06-14**

---

## 1. Ringkasan Project

| Item                    | Deskripsi                                                                      |
| ----------------------- | ------------------------------------------------------------------------------ |
| **Nama Project**        | NimbusDrive V2                                                                 |
| **Tipe Aplikasi**       | Cloud Storage / File Management (Web-based)                                   |
| **Tujuan**              | Aplikasi penyimpanan file berbasis web dengan dukungan share link, trash, dan activity log |
| **Status Umum**         | Backend & core features mostly complete, some UI menus still placeholder/dummy |
| **Stack Frontend**      | React 18 + TypeScript, Vite, shadcn/ui (Radix UI + Tailwind CSS), Axios       |
| **Stack Backend**       | Laravel 11, PHP 8.3+, Laravel Sanctum (token auth), SQLite/MySQL              |
| **Sistem Auth**         | Email/password login, Sanctum token-based auth, role-based access (admin/user)|
| **Sistem Storage**      | Local filesystem via Laravel Storage, soft deletes implemented                |
| **Catatan Penting**     | Menu: Devices, Server Monitor, Settings masih placeholder/UI-only belum backend. Activity Feed masih static/dummy data. |

---

## 2. Struktur Root Project

```
CLOUD_SERVER_V2/
├── backend/
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/
│   │   │   └── Middleware/
│   │   ├── Models/
│   │   └── Services/
│   ├── database/
│   │   ├── migrations/
│   │   ├── factories/
│   │   └── seeders/
│   ├── routes/
│   │   ├── api.php
│   │   └── web.php
│   ├── config/
│   ├── bootstrap/
│   ├── storage/
│   ├── public/
│   ├── tests/
│   ├── artisan
│   ├── composer.json
│   ├── phpunit.xml
│   └── vite.config.js
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── App.tsx
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   └── upload/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── types/
│   │   ├── styles/
│   │   ├── imports/
│   │   └── main.tsx
│   ├── public/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── postcss.config.mjs
│   ├── index.html
│   └── README.md
├── PROJECT_STRUCTURE.md
├── TODO.md
├── UPLOAD_LIMIT_FIX.md
└── .gitignore
```

| Path                 | Tipe    | Fungsi                                                      |
| -------------------- | ------- | ----------------------------------------------------------- |
| `backend/`           | Folder  | Backend API (Laravel 11)                                    |
| `frontend/`          | Folder  | Frontend (React + TypeScript + Vite)                        |
| `PROJECT_STRUCTURE.md`| File    | Dokumentasi struktur project (file ini)                     |
| `TODO.md`            | File    | Daftar todo/task development                                |
| `UPLOAD_LIMIT_FIX.md` | File    | Dokumentasi fix upload limit server                         |

---

## 3. Struktur Frontend Lengkap

```
frontend/src/
├── app/
│   ├── App.tsx                          (main app routing, URL-based history API)
│   ├── components/
│   │   ├── Sidebar.tsx                 (navigation menu, storage info)
│   │   ├── Topbar.tsx                  (header, logout button)
│   │   ├── FileTypeIcon.tsx            (icon component based on mime)
│   │   ├── LoadingSpinner.tsx
│   │   └── ... (other UI components)
│   ├── pages/
│   │   ├── Dashboard.tsx               (stats, recent files, charts)
│   │   ├── MyFiles.tsx                 (main file manager)
│   │   ├── Shared.tsx                  (share links management)
│   │   ├── Uploads.tsx                 (upload queue display)
│   │   ├── Devices.tsx                 (PLACEHOLDER: hardcoded)
│   │   ├── Activity.tsx                (STATIC/DUMMY: local activity)
│   │   ├── Trash.tsx                   (restore & delete)
│   │   ├── ServerMonitor.tsx           (PLACEHOLDER: dummy charts)
│   │   ├── Settings.tsx                (PLACEHOLDER: not saved)
│   │   ├── AdminUsers.tsx              (admin panel: list users)
│   │   ├── LoginPage.tsx               (login form)
│   │   └── PublicSharePage.tsx         (public share download)
│   └── upload/
│       ├── UploadManagerContext.tsx    (queue-based upload)
│       └── UploadTray.tsx              (UI for uploads)
├── pages/
│   └── ActivityLogPage.tsx             (real backend activity log)
├── services/
│   ├── api.ts                          (Axios + Sanctum)
│   ├── authService.ts
│   ├── fileService.ts
│   ├── folderService.ts
│   ├── shareService.ts
│   ├── trashService.ts
│   ├── storageService.ts
│   ├── activityLogService.ts
│   ├── adminUserService.ts
│   ├── recentFileService.ts
│   └── ... (other services)
├── types/
│   └── ... (TypeScript interfaces)
├── styles/
│   └── ... (CSS/styling)
├── main.tsx                             (React entry point)
└── ... (other files)
```

### Frontend Detail - Pages & Services

| #   | Path/File                          | Fungsi                                                         | Status             |
| --- | ----------------------------------- | -------------------------------------------------------------- | ------------------- |
| 1   | `App.tsx`                          | Main routing, URL-based page navigation via History API        | ✅ Selesai         |
| 2   | `components/Sidebar.tsx`           | Navigation menu, admin check, storage info display             | ✅ Selesai         |
| 3   | `components/Topbar.tsx`            | Header, user info, logout                                      | ✅ Selesai         |
| 4   | `components/FileTypeIcon.tsx`      | Dynamic icon based on mime type                                | ✅ Selesai         |
| 5   | `pages/Dashboard.tsx`              | Stats, recent files, charts (partial real data)               | 🟡 Partial         |
| 6   | `pages/MyFiles.tsx`                | Main file manager: upload, list, search, sort, bulk, preview | ✅ Selesai         |
| 7   | `pages/Shared.tsx`                 | Share link management: view, copy, open, delete                | ✅ Selesai         |
| 8   | `pages/Uploads.tsx`                | Global upload queue display                                    | ✅ Selesai         |
| 9   | `pages/Devices.tsx`                | Device list (PLACEHOLDER: hardcoded data, belum API)          | 🔴 Placeholder     |
| 10  | `pages/Activity.tsx`               | Activity feed (STATIC/DUMMY: local hardcoded activity list)   | 🟡 Partial/Static  |
| 11  | `pages/Trash.tsx`                  | Trash management: restore, permanent delete                    | ✅ Selesai         |
| 12  | `pages/ServerMonitor.tsx`          | Server monitoring (🟡 Partial / Real API) | 🟡 Partial / Real API     |

| 13  | `pages/Settings.tsx`               | Settings form (PLACEHOLDER: toggles not persisted to backend)  | 🔴 Placeholder     |
| 14  | `pages/AdminUsers.tsx`             | Admin panel: list users from API, role editing belum ada       | ✅ Selesai sebagian|
| 15  | `pages/LoginPage.tsx`              | Login form: email/password                                     | ✅ Selesai         |
| 16  | `pages/PublicSharePage.tsx`        | Public shared file view, download (public route)               | ✅ Selesai         |
| 17  | `pages/ActivityLogPage.tsx`        | Real backend activity log: filter, pagination                 | ✅ Selesai         |
| 18  | `upload/UploadManagerContext.tsx`  | Upload queue management via React Context                      | ✅ Selesai         |
| 19  | `upload/UploadTray.tsx`            | UI for active uploads display                                  | ✅ Selesai         |
| 20  | `services/authService.ts`          | login(), logout(), me()                                        | ✅ Selesai         |
| 21  | `services/fileService.ts`          | File CRUD, upload, preview, download, move operations         | ✅ Selesai         |
| 22  | `services/folderService.ts`        | Folder CRUD, move operations                                  | ✅ Selesai         |
| 23  | `services/shareService.ts`         | Share link CRUD                                                | ✅ Selesai         |
| 24  | `services/trashService.ts`         | Trash operations: restore, permanent delete                    | ✅ Selesai         |
| 25  | `services/storageService.ts`       | Get storage info                                               | ✅ Selesai         |
| 26  | `services/activityLogService.ts`   | Get activity logs with pagination & filter                     | ✅ Selesai         |
| 27  | `services/adminUserService.ts`     | Get admin users list                                           | ✅ Selesai         |
| 28  | `services/recentFileService.ts`    | Get recent files for dashboard                                 | ✅ Selesai         |
| 29  | `services/api.ts`                  | Axios instance with Sanctum token injection interceptor        | ✅ Selesai         |

---

## 4. Struktur Backend Lengkap

```
backend/app/
├── Http/
│   ├── Controllers/
│   │   ├── AuthController.php
│   │   ├── FileController.php
│   │   ├── FolderController.php
│   │   ├── ShareController.php
│   │   ├── TrashController.php
│   │   ├── StorageController.php
│   │   ├── ActivityLogController.php
│   │   └── Admin/
│   │       └── UserController.php
│   └── Middleware/
├── Models/
│   ├── User.php
│   ├── File.php
│   ├── Folder.php
│   ├── ShareLink.php
│   └── ActivityLog.php
├── Services/
│   └── ActivityLogService.php
└── Providers/

backend/database/
├── migrations/
│   ├── 0001_01_01_000000_create_users_table.php
│   ├── 0001_01_01_000001_create_cache_table.php
│   ├── 0001_01_01_000002_create_jobs_table.php
│   ├── 2026_06_08_172502_create_personal_access_tokens_table.php
│   ├── 2026_06_08_190000_create_folders_table.php
│   ├── 2026_06_08_200000_create_files_table.php
│   ├── 2026_06_09_000000_create_share_links_table.php
│   ├── 2026_06_10_000001_add_deleted_at_to_files_table.php
│   ├── 2026_06_10_000002_add_deleted_at_to_folders_table.php
│   ├── 2026_06_10_000003_create_activity_logs_table.php
│   └── 2026_06_14_000001_add_role_to_users_table.php
├── factories/
└── seeders/
```

### Backend Detail - Controllers & Models

| #   | Path/File                          | Fungsi                                                      | Status             |
| --- | ----------------------------------- | ----------------------------------------------------------- | ------------------- |
| 1   | `Controllers/AuthController`       | login(), me(), logout()                                     | ✅ Selesai         |
| 2   | `Controllers/FileController`       | CRUD, upload, preview, download, move, recent, cancel       | ✅ Selesai         |
| 3   | `Controllers/FolderController`     | CRUD, move                                                  | ✅ Selesai         |
| 4   | `Controllers/ShareController`      | CRUD, show/download (public)                                | ✅ Selesai         |
| 5   | `Controllers/TrashController`      | files, folders, restore, force delete                       | ✅ Selesai         |
| 6   | `Controllers/StorageController`    | info() - get storage used                                   | ✅ Selesai         |
| 7   | `Controllers/ActivityLogController`| index() - list with pagination & filter                     | ✅ Selesai         |
| 8   | `Controllers/Admin/UserController` | index() - list users (admin only)                           | ✅ Selesai         |
| 9   | `Models/User`                      | User model, role (admin\|user), isAdmin(), isUser()        | ✅ Selesai         |
| 10  | `Models/File`                      | File model, soft delete, mime_type, size, relationships    | ✅ Selesai         |
| 11  | `Models/Folder`                    | Folder model, soft delete, parent_id (hierarchical)         | ✅ Selesai         |
| 12  | `Models/ShareLink`                 | ShareLink model, token, file_id, relationships              | ✅ Selesai         |
| 13  | `Models/ActivityLog`               | ActivityLog model, polymorphic subject, user tracking        | ✅ Selesai         |
| 14  | `Services/ActivityLogService`      | log() method for creating activity log entries               | ✅ Selesai         |

---

## 5. Daftar Route/API Endpoint Lengkap

**Base API prefix: `/api`** 

Semua endpoint di bawah ini prefiksnya adalah `/api/...` (relatif).

| #   | Method | Endpoint                          | Controller                | Fungsi                                 | Auth        |
| --- | ------ | --------------------------------- | ------------------------- | -------------------------------------- | ----------- |
| 1   | POST   | `/auth/login`                     | AuthController            | Login user                             | Public      |
| 2   | GET    | `/auth/me`                        | AuthController            | Get current user info                  | ✅ Sanctum  |
| 3   | POST   | `/auth/logout`                    | AuthController            | Logout & revoke token                  | ✅ Sanctum  |
| 4   | GET    | `/storage`                        | StorageController         | Get storage used/info                  | ✅ Sanctum  |
| 5   | GET    | `/files`                          | FileController            | List files (folder_id or search)       | ✅ Sanctum  |
| 6   | POST   | `/files/upload`                   | FileController            | Upload file                            | ✅ Sanctum  |
| 7   | GET    | `/files/recent`                   | FileController            | Get recent files                       | ✅ Sanctum  |
| 8   | GET    | `/files/{file}/preview`           | FileController            | Get file preview blob                  | ✅ Sanctum  |
| 9   | GET    | `/files/{file}/download`          | FileController            | Download file                          | ✅ Sanctum  |
| 10  | PATCH  | `/files/{file}`                   | FileController            | Rename/update file metadata            | ✅ Sanctum  |
| 11  | PATCH  | `/files/{file}/move`              | FileController            | Move file to another folder            | ✅ Sanctum  |
| 12  | DELETE | `/files/{file}`                   | FileController            | Delete file (soft delete)              | ✅ Sanctum  |
| 13  | POST   | `/files/{file}/cancel-upload`     | FileController            | Cancel incomplete upload               | ✅ Sanctum  |
| 14  | GET    | `/folders`                        | FolderController          | List folders (parent_id or search)     | ✅ Sanctum  |
| 15  | POST   | `/folders`                        | FolderController          | Create folder                          | ✅ Sanctum  |
| 16  | PATCH  | `/folders/{folder}`               | FolderController          | Rename/update folder                   | ✅ Sanctum  |
| 17  | PATCH  | `/folders/{folder}/move`          | FolderController          | Move folder to parent folder           | ✅ Sanctum  |
| 18  | DELETE | `/folders/{folder}`               | FolderController          | Delete folder (soft delete)            | ✅ Sanctum  |
| 19  | GET    | `/share-links`                    | ShareController           | List share links user created          | ✅ Sanctum  |
| 20  | POST   | `/files/{file}/share`             | ShareController           | Create share link for file             | ✅ Sanctum  |
| 21  | DELETE | `/share-links/{shareLink}`        | ShareController           | Delete share link                      | ✅ Sanctum  |
| 22  | GET    | `/share/{token}`                  | ShareController           | Get public share link detail (NO AUTH) | Public      |
| 23  | GET    | `/share/{token}/download`         | ShareController           | Download from public share link        | Public      |
| 24  | GET    | `/trash/files`                    | TrashController           | List soft-deleted files                | ✅ Sanctum  |
| 25  | GET    | `/trash/folders`                  | TrashController           | List soft-deleted folders              | ✅ Sanctum  |
| 26  | POST   | `/trash/files/{id}/restore`       | TrashController           | Restore file from trash                | ✅ Sanctum  |
| 27  | POST   | `/trash/folders/{id}/restore`     | TrashController           | Restore folder from trash              | ✅ Sanctum  |
| 28  | DELETE | `/trash/files/{id}/force`         | TrashController           | Permanently delete file                | ✅ Sanctum  |
| 29  | DELETE | `/trash/folders/{id}/force`       | TrashController           | Permanently delete folder              | ✅ Sanctum  |
| 30  | GET    | `/activity-logs`                  | ActivityLogController     | List activity log (paginated/filtered) | ✅ Sanctum  |
| 31  | GET    | `/admin/users`                    | Admin\UserController      | List all users (ADMIN ONLY)           | ✅ Admin    |
| 32  | GET    | `/server-monitor`                | ServerMonitorController   | Get server monitor summary            | ✅ Sanctum  |

**Format Endpoint Notes:**

- Format relatif benar: `/auth/login`, `/files`, `/storage`
- Format full benar: `/api/auth/login`, `/api/files`, `/api/storage`
- Hindari format salah: `GET / api / storage` (spasi), `POST / api / auth / login`

---

## 6. Routing Frontend / Menu Navigation

**App.tsx menggunakan URL-based routing via Browser History API (bukan React Router).**

| #   | Menu/Page              | Route              | Component/Page       | Status             | Catatan                                 |
| --- | ---------------------- | ------------------- | -------------------- | ------------------- | --------------------------------------- |
| 1   | Dashboard              | `/` atau `/dashboard` | `Dashboard`        | 🟡 Partial         | Storage & recent files real API, widget lain dummy/static |
| 2   | My Files               | `/my-files`         | `MyFiles`            | ✅ Selesai         | File manager utama, upload, search, sort, bulk |
| 3   | Shared                 | `/shared`           | `Shared`             | ✅ Selesai         | Share link management                  |
| 4   | Uploads                | `/uploads`          | `Uploads`            | ✅ Selesai         | Global upload queue display            |
| 5   | Devices                | `/devices`          | `Devices`            | 🔴 Placeholder     | Data hardcoded, belum API              |
| 6   | Activity Feed          | `/activity-feed`    | `Activity`           | 🟡 Partial/Static  | Data hardcoded/local, belum backend    |
| 7   | Activity Log           | `/activity`         | `ActivityLogPage`    | ✅ Selesai         | Real API, paginated, filterable       |
| 8   | Trash                  | `/trash`            | `Trash`              | ✅ Selesai         | Soft-deleted files/folders             |
| 9   | Server Monitor         | `/server-monitor`   | `ServerMonitor`      | 🔴 Placeholder     | CPU/RAM/disk/services dummy/random     |
| 10  | Settings               | `/settings`         | `Settings`           | 🔴 Placeholder     | Form toggles not persisted to backend   |
| 11  | Admin Users            | `/admin/users`      | `AdminUsers`         | ✅ Selesai sebagian| List users real API, role editing belum |
| 12  | Public Share           | `/share/{token}`    | `PublicSharePage`    | ✅ Selesai         | Public shared file download page        |
| 13  | Login                  | (no menu)           | `LoginPage`          | ✅ Selesai         | Shown when not authenticated           |

---

## 7. Status Fitur Saat Ini (Lengkap)

### Checklist Fitur Comprehensive

| #   | Fitur                  | Status             | Bukti dari Kode                                                | Catatan                                      |
| --- | ---------------------- | ------------------- | ------------------------------------------------------------ | -------------------------------------------- |
| 1   | Login / Logout         | ✅ Selesai         | AuthController: login(), logout(); Sanctum token auth        | Email/password, token-based                |
| 2   | Dashboard              | 🟡 Partial         | Dashboard.tsx: storage real API, recent files real, stats/charts dummy/static | Beberapa widget belum real backend        |
| 3   | My Files               | ✅ Selesai         | MyFiles.tsx: upload, list, search, sort, filter, bulk delete/share/download, preview, rename, move | Complete   |
| 4   | Upload Manager         | ✅ Selesai         | UploadManagerContext: queue-based, retry, cancel, progress tracking | With UploadTray UI |
| 5   | Uploads (Page)         | ✅ Selesai         | Uploads.tsx: displays upload queue from context              | Queue status display                       |
| 6   | Folder CRUD            | ✅ Selesai         | FolderController: create, read, update, delete; soft delete  | With hierarchical parent_id              |
| 7   | File CRUD              | ✅ Selesai         | FileController: create, read, update, delete; soft delete    | Upload, rename, delete                   |
| 8   | File Preview           | ✅ Selesai         | MyFiles.tsx: modal preview image, PDF, video, audio, text, code | Audio player, image zoom, text display |
| 9   | Search Files/Folders   | ✅ Selesai         | FileController.index() & FolderController.index(): keyword search | Global across active files only      |
| 10  | Sort/Filter            | ✅ Selesai         | MyFiles.tsx: sort by name/date/size, filter by type          | UI toggles available                     |
| 11  | Bulk Action            | ✅ Selesai         | MyFiles.tsx: bulk delete, bulk share, bulk download          | Selection checkboxes                     |
| 12  | Move File/Folder       | ✅ Selesai         | API endpoints exist: PATCH /files/{id}/move, PATCH /folders/{id}/move | FileController & FolderController |
| 13  | Share Link             | ✅ Selesai         | ShareController: create, list, delete; public endpoints      | Token-based public share                |
| 14  | Shared Page            | ✅ Selesai         | Shared.tsx: list, copy link, open, delete share links        | Integration with shareService           |
| 15  | Public Share Page      | ✅ Selesai         | PublicSharePage.tsx: view & download shared files (no auth)   | Public endpoints working                |
| 16  | Trash                  | ✅ Selesai         | TrashController: list, restore, force delete soft-deleted items | Restore & permanent delete              |
| 17  | Activity Feed          | 🟡 Partial/Static  | Activity.tsx: hardcoded activity log, filter & search locally | Belum connected ke backend API           |
| 18  | Activity Log           | ✅ Selesai         | ActivityLogPage.tsx + ActivityLogController: real backend, pagination, filter | Real API `/api/activity-logs`      |
| 19  | Storage Used           | ✅ Selesai         | StorageController.info(); Dashboard displays used/total      | Real API integration                     |
| 20  | FileTypeIcon           | ✅ Selesai         | FileTypeIcon.tsx: dynamic icon based on mime type            | Used throughout app                      |
| 21  | Permissions/Roles      | ✅ Selesai sebagian| User model: role field, Sidebar checks isAdmin, admin middleware on routes | Admin check exists, but role editing not implemented |
| 22  | Admin Users Panel      | ✅ Selesai sebagian| AdminUsers.tsx + Admin/UserController: list users real API   | Role editing API belum ada               |
| 23  | Devices                | 🔴 Placeholder     | Devices.tsx: hardcoded device list, no backend API           | UI only                                  |
| 24  | Server Monitor         | 🔴 Placeholder     | ServerMonitor.tsx: dummy CPU/RAM/disk/network/services/alerts | All random/dummy data                   |
| 25  | Settings               | 🔴 Placeholder     | Settings.tsx: form toggles, not persisted to backend         | UI only                                  |

---

## 8. Status Menu Berdasarkan Audit Repo

| #   | Menu               | Route              | Status             | Catatan                                              |
| --- | ------------------- | ------------------- | ------------------- | ---------------------------------------------------- |
| 1   | Dashboard           | `/` atau `/dashboard`| 🟡 Partial         | Storage & recent files real API, widget lain dummy   |
| 2   | My Files            | `/my-files`        | ✅ Selesai         | Complete file manager with all features             |
| 3   | Shared              | `/shared`          | ✅ Selesai         | Share link management working                        |
| 4   | Uploads             | `/uploads`         | ✅ Selesai         | Upload queue display from context                    |
| 5   | Devices             | `/devices`         | 🔴 Placeholder     | Hardcoded data, no backend API                       |
| 6   | Activity Feed       | `/activity-feed`   | 🟡 Partial/Static  | Hardcoded activity, filter/search local only         |
| 7   | Activity Log        | `/activity`        | ✅ Selesai         | Real API, pagination, filter working                 |
| 8   | Trash               | `/trash`           | ✅ Selesai         | Restore & permanent delete working                   |
| 9   | Server Monitor      | `/server-monitor`  | 🔴 Placeholder     | CPU/RAM/disk/services all dummy/random               |
| 10  | Settings            | `/settings`        | 🔴 Placeholder     | Form not saved to backend                            |
| 11  | Admin Users         | `/admin/users`     | ✅ Selesai sebagian| List users real API, role editing not implemented    |
| 12  | Public Share        | `/share/{token}`   | ✅ Selesai         | Public download page working                         |

---

## 9. Menu Placeholder / Belum Real Backend (Detail)

| #   | Menu               | Kondisi Saat Ini            | Yang Belum Ada                                     | Rekomendasi                                |
| --- | ------------------- | ----------------------- | -------------------------------------------------- | ------------------------------------------ |
| 1   | Devices            | UI-only, data hardcoded | Backend API device, Model Device, Controller, Database table for device sync tracking | Implement backend device management API  |
| 2   | Server Monitor     | Dummy/random/static data| API monitoring (CPU, RAM, disk, network, services, alerts real-time) | Implement server monitoring API (system info/metrics) |
| 3   | Settings           | UI form/toggle saja     | Save profile, password, notification, security, storage, sync, appearance, API keys to backend | Implement settings API & database storage |
| 4   | Activity Feed      | Data local/static       | Integrasi ke backend activity log (Activity Feed & Activity Log seharusnya sama) | Merge Activity Feed dengan Activity Log real backend |
| 5   | Admin Users        | List users only         | Role editing, user add/remove, permission management | Add user management endpoints (edit, delete, create) |

---

## 10. Detail Widget Dashboard

| Widget/Data                | Status         | Sumber Data        | Catatan                                 |
| -------------------------- | ------------------- | ------------------- | --------------------------------------- |
| Storage Used               | ✅ Real API    | `/api/storage`      | Fetch actual storage from backend       |
| Recent Files               | ✅ Real API    | `/api/files/recent` | Fetch recent files                      |
| Files Count                | 🟡 Dummy/Static| Hardcoded "345"     | Not from API                            |
| Shared Links Count         | 🟡 Dummy/Static| Hardcoded "243"     | Not from API                            |
| Storage Breakdown Chart    | 🟡 Dummy/Static| Hardcoded data      | Random percentages                      |
| Server Status              | 🟡 Dummy/Static| Hardcoded status    | Not from monitoring API                 |
| Sync Status                | 🟡 Dummy/Static| Hardcoded            | Not real                                |
| Active Devices             | 🟡 Dummy/Static| Hardcoded list      | Not from backend device management      |

---

## 11. Service to Controller Mapping

| #   | Frontend Service         | Backend Controller        | Endpoint Utama                                   | Status             |
| --- | ----------------------- | ----------------------- | ------------------------------------------------- | ------------------- |
| 1   | `authService.ts`        | `AuthController`        | `/auth/login`, `/auth/me`, `/auth/logout`       | ✅ Selesai         |
| 2   | `fileService.ts`        | `FileController`        | `/files`, `/files/upload`, `/files/{id}/move`   | ✅ Selesai         |
| 3   | `folderService.ts`      | `FolderController`      | `/folders`, `/folders/{id}`, `/folders/{id}/move`| ✅ Selesai         |
| 4   | `shareService.ts`       | `ShareController`       | `/share-links`, `/files/{id}/share`, `/share/{token}` (public) | ✅ Selesai |
| 5   | `trashService.ts`       | `TrashController`       | `/trash/files`, `/trash/folders`, `/trash/*/restore`, `/trash/*/force` | ✅ Selesai |
| 6   | `storageService.ts`     | `StorageController`     | `/storage`                                      | ✅ Selesai         |
| 7   | `activityLogService.ts` | `ActivityLogController` | `/activity-logs`                                | ✅ Selesai         |
| 8   | `adminUserService.ts`   | `Admin/UserController`  | `/admin/users`                                  | ✅ Selesai         |
| 9   | `recentFileService.ts`  | `FileController`        | `/files/recent`                                 | ✅ Selesai         |
| 10  | `api.ts` (base)         | (middleware)            | All endpoints via Sanctum token injection       | ✅ Selesai         |
| 11  | `serverMonitorService.ts` | `ServerMonitorController` | `/server-monitor`                            | 🟡 Partial / Real API |


---

## 12. Database Models & Migrations

| #   | Model              | Migration                              | Fungsi                                                     | Catatan                            |
| --- | ------------------- | -------------------------------------- | ---------------------------------------------------------- | ---------------------------------- |
| 1   | `User`             | `create_users_table`                   | User authentication, role (admin\|user)                   | Sanctum tokens via pivot table    |
| 2   | `File`             | `create_files_table` +  `add_deleted_at_to_files_table`| File storage, mime_type, size, soft delete | user_id FK, folder_id FK          |
| 3   | `Folder`           | `create_folders_table` + `add_deleted_at_to_folders_table`| Folder hierarchy, soft delete | user_id FK, parent_id FK (recursive) |
| 4   | `ShareLink`        | `create_share_links_table`             | Public share via token                                     | file_id FK, token unique          |
| 5   | `ActivityLog`      | `create_activity_logs_table`           | Audit trail: user actions, polymorphic subject            | user_id FK, subject_type/subject_id (polymorphic) |
| 6   | `PersonalAccessToken`| `create_personal_access_tokens_table`| Sanctum auth tokens                                        | user_id FK, token unique          |

**Key Database Features:**
- **Soft Deletes**: Files & Folders punya `deleted_at` column untuk trash feature
- **Polymorphic Relations**: ActivityLog bisa track berbagai subject types (File, Folder, User)
- **Role Management**: User model has role field (admin|user)
- **User Relationships**: hasMany files, hasMany folders, hasMany activityLogs

---

## 13. State Management Frontend (Comprehensive)

| #   | Lokasi/File                      | State/Context        | Fungsi                                             | TypeScript Type |
| --- | --------------------------------- | -------------------- | -------------------------------------------------- | --------------- |
| 1   | `App.tsx`                        | `token`              | Sanctum auth token, stored di localStorage        | `string \| null` |
| 2   | `App.tsx`                        | `pathname`           | Current URL path untuk routing                    | `string`        |
| 3   | `App.tsx`                        | `activePage`         | Active menu page identifier                       | `string`        |
| 4   | `App.tsx`                        | `storageRefreshKey`  | Increment to trigger storage refetch              | `number`        |
| 5   | `App.tsx`                        | `filesRefreshKey`    | Increment to trigger files list refetch           | `number`        |
| 6   | `UploadManagerContext.tsx`       | `items`              | Array of UploadQueueItem (queue state)            | `UploadQueueItem[]` |
| 7   | `UploadManagerContext.tsx`       | `hasActiveUploads`   | Boolean: ada active upload?                       | `boolean`       |
| 8   | `UploadManagerContext.tsx`       | `collapsed`          | UI state: tray collapsed or expanded              | `boolean`       |
| 9   | `UploadManagerContext.tsx`       | `isTrayVisible`      | UI state: tray visible or hidden                  | `boolean`       |
| 10  | `localStorage`                   | `nimbus_token`       | Sanctum auth token persisted                      | `string`        |
| 11  | `localStorage`                   | `nimbus_user`        | User info (JSON): id, name, email, role           | `UserObject`    |
| 12  | `localStorage` (Activity.tsx)    | `nimbus_deleted_activity_ids`| Deleted activity IDs (local)| `string[]` |
| 13  | `localStorage` (ActivityLogPage)| `nimbus_deleted_activity_log_keys`| Deleted activity log IDs| `string[]` |
| 14  | `MyFiles.tsx`                    | `previewUrl`         | Blob URL for file preview                         | `string \| undefined` |
| 15  | `MyFiles.tsx`                    | `previewModalMode`   | File preview type: 'image', 'audio', 'video', 'text' | `string` |
| 16  | `MyFiles.tsx`                    | `selectedFileIds`    | Set of selected file IDs for bulk actions         | `Set<string>`   |
| 17  | `MyFiles.tsx`                    | `selectedFolderIds`  | Set of selected folder IDs for bulk actions       | `Set<string>`   |

**Important TypeScript Note:**
- `previewUrl` should be typed as `string | undefined`, NOT `string | null`
- HTML elements (img, iframe) expect `undefined` for unset, not `null`

---

## 14. Temuan Audit & Ketidaksesuaian

| #   | Temuan                                            | Lokasi                              | Dampak                                         | Rekomendasi                                    |
| --- | ------------------------------------------------- | ----------------------------------- | ---------------------------------------------- | ---------------------------------------------- |
| 1   | Dashboard widget "Shared Links Count" dummy      | Dashboard.tsx                       | User see inaccurate count                      | Fetch real count from `/share-links` endpoint |
| 2   | Activity Feed data hardcoded, belum backend      | Activity.tsx                        | Duplicates Activity Log feature, confusing UI  | Remove Activity Feed or merge dengan Activity Log |
| 3   | Devices page data hardcoded                      | Devices.tsx                         | Feature incomplete, no sync tracking           | Implement Device Management API & backend     |
| 4   | Server Monitor CPU/RAM/disk all dummy/random    | ServerMonitor.tsx                  | Metrics fake, useless for admin                | Implement real system monitoring API           |
| 5   | Settings form not persisted                      | Settings.tsx                        | Changes not saved, UI misleading                | Implement Settings API & database              |
| 6   | Activity Log filtering only on 'action' field   | ActivityLogPage.tsx                | Limited filter capabilities                    | Add more filter options (date range, user)    |
| 7   | Admin Users: role editing not implemented        | AdminUsers.tsx & API                | Admin can't change user roles                  | Implement PATCH /admin/users/{id} endpoint    |
| 8   | Activity Feed delete stored in localStorage      | Activity.tsx                        | Delete state not persisted across sessions     | Use backend for Activity Feed data persistence|
| 9   | TypeScript: previewUrl uses `string \| null`   | MyFiles.tsx                        | Type mismatch with HTML elements expecting `undefined` | Change to `string \| undefined`       |

---

## 15. Rekomendasi Next Development (Prioritas)

| Prioritas | Area                       | Task                                                    | Alasan                                                         |
| --------- | ----------------------- | ------------------------------------------------------- | ------------------------------------------------------------ |
| 1         | Dashboard                | Selesaikan widget yang masih dummy (files count, shared count, charts) atau beri label "Coming Soon" | User expectations mismatch |
| 2         | Menu Visibility           | Sembunyikan atau beri label "Coming Soon" untuk Devices, Server Monitor, Settings | Reduce user confusion              |
| 3         | Activity Feed vs Log      | Merge Activity Feed dengan Activity Log (single page) atau remove Activity Feed | Prevent duplication & confusion  |
| 4         | Admin Users               | Implement role editing, user add/remove via new API endpoints | Complete admin functionality     |
| 5         | Backend APIs              | Create Device Management, Settings, Server Monitoring APIs for placeholder features | Enable complete features         |
| 6         | Settings Persistence      | Implement backend storage for user settings (profile, appearance, API keys) | Make Settings functional          |
| 7         | TypeScript               | Audit & fix type mismatches (e.g., `previewUrl` type)   | Ensure type safety               |
| 8         | Testing                   | Add integration & e2e tests for critical flows         | Quality assurance                |
| 9         | Documentation             | Maintain API docs, update routes docs if changed       | Onboard developers               |
| 10        | Performance              | Profile upload speed, large file list rendering, pagination optimization | Optimize user experience         |

---

## 16. Kesimpulan & Rekomendasi Final

### Ringkasan Status Fitur

**Fitur Inti Cloud Storage (SELESAI):** ✅
- ✅ Login / Logout
- ✅ My Files (upload, download, rename, delete, move, search, sort, bulk actions, preview)
- ✅ Folder CRUD & hierarchical navigation
- ✅ File CRUD & soft delete
- ✅ Share Link (create, manage, public download)
- ✅ Trash (restore, permanent delete)
- ✅ Activity Log (real backend tracking)
- ✅ Storage Used (monitoring)
- ✅ Role-Based Access (admin/user)

**Fitur Partial (SEBAGIAN):** 🟡
- 🟡 Dashboard (storage & recent files real, widget lain dummy)
- 🟡 Activity Feed (hardcoded, belum backend - should be removed or merged with Activity Log)
- 🟡 Admin Users (list real, editing not implemented)

**Fitur Placeholder / UI-Only (BELUM BACKEND):** 🔴
- 🔴 Devices (no backend device management)
- 🔴 Server Monitor (no real system monitoring)
- 🔴 Settings (form not persisted)

### Production Readiness Analysis

| Aspek                   | Status                                                            |
| ----------------------- | ---------------------------------------------------------------- |
| **Production Ready**     | Partial - Core features ready, placeholder features should be removed/hidden |
| **Backend Completeness** | 85% - Main APIs done, admin/settings/monitoring APIs missing     |
| **Frontend Completeness**| 88% - UI done, some features still dummy data                    |
| **Type Safety**          | 98% - TypeScript mostly correct, minor type fixes recommended   |
| **Testing**              | ❓ Perlu verifikasi manual - No visible test coverage           |

### Saran Step Berikutnya (Immediate)

1. **Prioritas 1**: Finish or remove placeholder features (Devices, Server Monitor, Settings)
2. **Prioritas 2**: Implement role editing in Admin Users - complete admin functionality
3. **Prioritas 3**: Fix Activity Feed confusion - remove or merge with Activity Log  
4. **Prioritas 4**: Complete Dashboard widgets with real data or remove dummy ones
5. **Prioritas 5**: Add comprehensive test suite for critical user flows
6. **Prioritas 6**: Optimize for production & setup CI/CD pipeline

### Key Strengths ✅

- Clean file management architecture with proper separation of concerns
- Solid React patterns (Context API, component composition)
- Proper backend authentication (Laravel Sanctum)
- Complete API for core features
- Activity logging system for audit trails
- Soft deletes for data safety

### Key Weaknesses ❌

- UI-only placeholder features create UX confusion
- Activity Feed redundancy with Activity Log
- No visible comprehensive test coverage
- Some widgets still return dummy data
- Role management incomplete in admin panel

---

**END OF AUDIT DOCUMENT**

**Generated: 2026-06-14 | Auditor: AI Code Audit System | Confidence Level: HIGH**

---

## 17. Scan Ulang Struktur Project (Update 2026-06-15)

Bagian ini ditambahkan sebagai update hasil scan ulang folder project. Isi audit utama tanggal 2026-06-14 di atas tetap dipertahankan.

### Scope Scan

Scan dilakukan pada root `CLOUD_SERVER_V2/` dengan fokus pada source code dan dokumen project. Folder besar/generated seperti `.git/`, `backend/vendor/`, `frontend/node_modules/`, cache Laravel, session, compiled views, log, dan private uploaded files tidak dimasukkan sebagai struktur source.

### Ringkasan File Source Saat Ini

| Area / Path            | Jumlah File Ter-scan | Catatan |
| ---------------------- | -------------------- | ------- |
| Root docs/config       | 4                    | `.gitignore`, `PROJECT_STRUCTURE.md`, `TODO.md`, `UPLOAD_LIMIT_FIX.md` |
| `.codex/`              | 5                    | Local Codex/OpenSpec skill definitions |
| `.github/`             | 10                   | Prompt dan skill workflow OpenSpec |
| `.vscode/`             | 1                    | Workspace settings |
| `backend/`             | 83                   | Laravel backend source, config, tests, routes, migrations |
| `frontend/`            | 103                  | React/Vite frontend source, services, UI components, assets |
| `openspec/`            | 6                    | Active OpenSpec change proposals/design/tasks |

### Struktur Root Aktual Tambahan

```
CLOUD_SERVER_V2/
|-- .codex/
|   `-- skills/
|       |-- openspec-apply-change/
|       |-- openspec-archive-change/
|       |-- openspec-explore/
|       |-- openspec-propose/
|       `-- openspec-sync-specs/
|-- .github/
|   |-- prompts/
|   |   |-- opsx-apply.prompt.md
|   |   |-- opsx-archive.prompt.md
|   |   |-- opsx-explore.prompt.md
|   |   |-- opsx-propose.prompt.md
|   |   `-- opsx-sync.prompt.md
|   `-- skills/
|       |-- openspec-apply-change/
|       |-- openspec-archive-change/
|       |-- openspec-explore/
|       |-- openspec-propose/
|       `-- openspec-sync-specs/
|-- .vscode/
|   `-- settings.json
|-- backend/
|-- frontend/
|-- openspec/
|   |-- changes/
|   |   |-- merge-activity-feed-into-activity-log/
|   |   `-- separate-user-activity-and-admin-activity-log/
|   `-- specs/
|-- PROJECT_STRUCTURE.md
|-- TODO.md
|-- UPLOAD_LIMIT_FIX.md
`-- .gitignore
```

### Update Path Root

| Path | Tipe | Fungsi / Catatan |
| ---- | ---- | ---------------- |
| `.codex/skills/` | Folder | Skill lokal Codex untuk workflow OpenSpec di project ini |
| `.github/prompts/` | Folder | Prompt workflow OpenSpec: apply, archive, explore, propose, sync |
| `.github/skills/` | Folder | Mirror skill OpenSpec untuk GitHub/Copilot workflow |
| `.vscode/settings.json` | File | Setting workspace, termasuk tambahan PATH OpenSpec untuk terminal Windows |
| `openspec/changes/` | Folder | Draft perubahan aktif berbasis proposal, design, dan tasks |
| `openspec/specs/` | Folder | Folder target spesifikasi utama; saat scan ini belum berisi file source spec |
| `frontend/ATTRIBUTIONS.md` | File | Attribution/licensing frontend assets atau generated/imported resources |
| `frontend/guidelines/Guidelines.md` | File | Guidelines frontend/design yang ikut tersimpan di repo |

### Update Frontend Structure

Tambahan dan detail yang belum tercatat eksplisit pada audit sebelumnya:

```
frontend/
|-- ATTRIBUTIONS.md
|-- guidelines/
|   `-- Guidelines.md
|-- src/
|   |-- imports/
|   |   |-- ChatGPT_Image_8_Jun_2026__02.33.08.png
|   |   `-- ChatGPT_Image_8_Jun_2026__02.33.08-1.png
|   |-- types/
|   |   `-- activityLog.ts
|   |-- app/
|   |   |-- components/
|   |   |   |-- figma/
|   |   |   |   `-- ImageWithFallback.tsx
|   |   |   `-- ui/
|   |   |       `-- 48 shadcn/Radix-style UI component/helper files
|   |   |-- pages/
|   |   |   `-- 12 app page files
|   |   `-- upload/
|   |       `-- 2 upload context/tray files
|   |-- pages/
|   |   `-- ActivityLogPage.tsx
|   |-- services/
|   |   `-- 11 service files
|   `-- styles/
|       `-- 5 CSS/theme files
```

| Path | Catatan Update |
| ---- | -------------- |
| `frontend/src/app/components/ui/` | Berisi 48 file komponen/helper UI seperti `button`, `dialog`, `table`, `tabs`, `tooltip`, `utils`, dan `use-mobile` |
| `frontend/src/app/components/figma/ImageWithFallback.tsx` | Komponen fallback image dari export/design source |
| `frontend/src/types/activityLog.ts` | TypeScript type khusus activity log |
| `frontend/src/imports/` | Menyimpan 2 asset PNG hasil import/generate |
| `frontend/src/services/authServices.ts` | File service tambahan dengan nama mirip `authService.ts`; perlu diperhatikan agar tidak membingungkan import |
| `frontend/guidelines/Guidelines.md` | Dokumen guideline frontend yang belum masuk daftar struktur lama |

### Update Backend Structure

Struktur backend utama masih sesuai audit sebelumnya: controller, model, middleware, service, route, dan migration inti tetap berada pada lokasi yang sama. Tambahan detail file yang ter-scan:

| Path | Catatan Update |
| ---- | -------------- |
| `backend/.editorconfig` | Editor config backend |
| `backend/.env.example` | Template environment Laravel |
| `backend/.gitattributes` | Git attributes backend |
| `backend/.gitignore` | Ignore rules backend |
| `backend/.npmrc` | NPM config backend |
| `backend/public/.htaccess` | Apache rewrite config untuk public entry |
| `backend/resources/css/app.css` | Default Laravel frontend CSS resource |
| `backend/resources/js/app.js` | Default Laravel frontend JS resource |
| `backend/resources/views/welcome.blade.php` | Default Laravel Blade view |
| `backend/shared-download-test` | File test/manual artifact untuk shared download |

### Backend App Files Terkonfirmasi

| Area | File Terkonfirmasi |
| ---- | ------------------ |
| Controllers | `ActivityLogController.php`, `AuthController.php`, `FileController.php`, `FolderController.php`, `ShareController.php`, `StorageController.php`, `TrashController.php`, `Admin/UserController.php` |
| Middleware | `EnsureUserIsAdmin.php` |
| Models | `ActivityLog.php`, `File.php`, `Folder.php`, `ShareLink.php`, `User.php` |
| Services | `ActivityLogService.php` |
| Routes | `api.php`, `console.php`, `web.php` |
| Migrations | 11 migration files, sama seperti daftar audit 2026-06-14 |

### Update OpenSpec / Workflow Docs

OpenSpec sekarang menjadi bagian struktur repo dan memiliki dua change aktif:

| Change | File | Status Struktur |
| ------ | ---- | --------------- |
| `merge-activity-feed-into-activity-log` | `design.md`, `proposal.md`, `tasks.md` | Ada di `openspec/changes/` |
| `separate-user-activity-and-admin-activity-log` | `design.md`, `proposal.md`, `tasks.md` | Ada di `openspec/changes/` |

Catatan: `openspec/specs/` ada sebagai folder, tetapi pada scan ini belum ditemukan file spec di dalamnya.

### Catatan Konsistensi Setelah Scan

- Dokumentasi lama sudah mencatat struktur aplikasi inti dengan cukup lengkap.
- Update utama yang perlu dianggap tambahan adalah folder workflow/tooling: `.codex/`, `.github/`, `.vscode/`, dan `openspec/`.
- Struktur frontend aktual lebih detail dari ringkasan lama karena sudah mencakup `ATTRIBUTIONS.md`, `guidelines/`, `imports/`, `types/activityLog.ts`, dan 48 file UI component/helper.
- Struktur backend inti tidak menunjukkan penambahan controller/model/migration baru di luar yang sudah tercatat pada audit sebelumnya.
- File `frontend/src/services/authServices.ts` dan `frontend/src/services/authService.ts` sama-sama ada; ini bukan perubahan kode, hanya temuan struktur yang perlu diwaspadai saat import service.

**Scan Update Generated: 2026-06-15 | Scope: Source structure only | Original audit retained**

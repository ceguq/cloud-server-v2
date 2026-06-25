# Design: Frontend-only “Files” tab filter in `GDrive.tsx`

## Overview
Implement the **Files** tab using frontend-only filtering based on existing data already loaded in `frontend/src/app/pages/GDrive.tsx`.

The page currently loads a list of Google Drive items into `gdriveFiles`, then normalizes into `gdriveAllFiles` (UI model), and finally derives `filteredFiles` based on:
- current tab (`tab`)
- search query (`search`)

The rendering splits `filteredFiles` into:
- `folderItems` (folder items)
- `regularFileItems` (non-folder items)

## Approach
### 1) Extend tab type + tabs list
- Add a new `TabKey` value: `files`.
- Add a new tab definition in the `tabs` array with label **Files**.
- Ensure the order becomes:
  **All Files → Files → Starred → Shared → Recent**

### 2) Implement Files tab filtering
- Reuse the existing helper that detects folders.
  - Current helper: `isGDriveFolder(file)` which checks:
    `file.mime === "application/vnd.google-apps.folder"`

- When `tab === "files"`:
  - filter out folders, keeping only non-folder items
  - folder items must not be rendered in the UI

Conceptually:
- Files tab mode => `filteredFiles = gdriveAllFiles.filter(file => !isGDriveFolder(file))`

### 3) Keep account scope intact
- Do **not** merge accounts.
- The existing API results and mapping already include `account_id`.
- If the API list is already scoped to the active account, then filtering only needs to remove folders.
- If there is any possibility of mixed `account_id` items in `gdriveAllFiles`, apply an additional guard in the Files tab filter:
  - ensure `file.accountId === activeAccountId` (or equivalent scope check)
  - do not show any items from other accounts

### 4) Do not use rowKey for API
- Filtering must operate on the existing in-memory list (`filteredFiles`, `gdriveAllFiles`).
- `rowKey` remains a UI identity only.

### 5) Rendering rules
- When Files tab is active:
  - hide the “Folders” section entirely
  - ensure only `regularFileItems` are shown
- Keep all existing rendering and interaction logic unchanged:
  - preview modal
  - download
  - action menu
  - right-click context menu
  - grid/list mode and rowKey/id separation

## Summary of required changes (frontend-only)
- Update `TabKey` union type and `tabs` array to include **Files** in the correct position/order.
- Update `filteredFiles` derivation logic to support `tab === "files"`.
- Ensure “Folders” section rendering is hidden when Files tab is active, without altering other tabs’ behavior.


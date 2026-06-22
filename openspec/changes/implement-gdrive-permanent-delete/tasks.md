# Tasks: implement-gdrive-permanent-delete

- [x] Audit backend routes for any existing permanent-delete endpoint for GDrive.
- [x] Audit `GDriveController` for existing permanent delete methods.
- [x] Audit `GoogleDriveService` for any existing permanent delete / hard delete implementation.
- [x] Audit `frontend/src/services/gdriveService.ts` for any existing delete-permanent function.
- [x] Audit `frontend/src/app/pages/GDrive.tsx` renderFileActions logic for Trash vs Files mode.
- [x] Add backend permanent-delete endpoint (if missing).
- [x] Add backend service method to perform permanent delete against Google Drive.
- [x] Add frontend service method to call the new backend endpoint.
- [x] Add UI action **Delete Permanently** only for `driveListMode === "trash"`.
- [x] Add confirmation before invoking the delete API.
- [x] Refresh Trash list after successful permanent delete.
- [x] Ensure **Restore** action remains present in Trash mode.
- [x] Ensure **Files** mode does **not** show Delete Permanently.
- [x] Ensure dropdown positioning/click-outside/Escape behavior is unchanged.
- [x] Ensure the layout row/header/actions column is unchanged.

- [x] Manual browser test Delete Permanently from Trash mode.

Notes: Manual browser testing passed: cancel keeps file in Trash, confirm permanently deletes file and refreshes Trash list.





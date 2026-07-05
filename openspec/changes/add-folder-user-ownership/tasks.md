# Tasks: Add folder user ownership

- [x] Audit current folder ownership usage and identify all folder-scoped entry points.
- [x] Add a migration for folders.user_id and the supporting foreign key/index.
- [x] Update the Folder model fillable fields and relations if needed for ownership support.
- [x] Update FolderController to filter folder queries by the authenticated user and enforce ownership on create, rename, and move.
- [x] Update FileController to validate folder ownership during move and upload flows.
- [x] Update TrashController so folder restore and force-delete operations are scoped to the owner.
- [x] Update StorageController folder-count logic if it needs ownership-aware filtering.
- [ ] Update tests or add a minimal manual verification checklist for folder ownership behavior.
- [ ] Run build and test validation manually later by the user only.

## Manual verification checklist
- [x] Run backend migration manually.
- [x] Login as User A.
- [x] Create root folder as User A.
- [x] Create child folder as User A.
- [x] Upload file to User A folder.
- [x] Move file from User A folder to root.
- [x] Move file back into User A folder.
- [x] Delete and restore User A folder from Trash.
- [x] Confirm storage folder count only includes User A folders.
- [x] Login as User B.
- [x] Confirm User B cannot see User A folders.
- [x] Confirm User B cannot upload/move files into User A folders.
- [x] Confirm User B trash does not show User A deleted folders.
- [x] Run frontend build manually.
- [x] Run backend tests manually if available.

Note: Full UI-level multi-user isolation verification passed using separate admin and regular user sessions. Direct manual API cross-user request testing was not performed, but UI flow confirms cross-user folders are not visible or selectable.

Note: Legacy folders with NULL user_id are intentionally hidden from authenticated folder APIs until ownership is safely assigned or backfilled.

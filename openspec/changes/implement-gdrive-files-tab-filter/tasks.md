# Tasks: Implement “Files” tab filter in GDrive

## Checklist
- [ ] Audit `GDrive.tsx` tab/filter state existing (`tab`, `filteredFiles`, folder vs regular split).
- [ ] Add `TabKey` value for `files`.
- [ ] Add new tab definition **Files** right after **All Files** and keep order:
  **All Files → Files → Starred → Shared → Recent**.
- [x] Add filter mode `Files` that shows only non-folder items (inline MIME check: `file.mime !== "application/vnd.google-apps.folder"`, to avoid calling `isGDriveFolder` before initialization).
- [x] Ensure folder section is hidden when Files tab is active.
- [x] Ensure displayed files remain in scope of the active/current account (no other `account_id`).
- [x] Ensure list/grid mode still works with the new tab.
- [x] Ensure preview/download/action menu/right-click/grid-list behavior remains unchanged.
- [x] Build and manual browser test.
  - [ ] Switch between All Files / Files / Starred / Shared / Recent.
  - [ ] Verify folders are hidden only in Files tab.
  - [ ] Verify actions (preview/download/menu) still work for non-folder items.
  - [ ] Verify no items from other Drive accounts appear.
- [ ] Commit as a separate changeset (dedicated commit for this feature).


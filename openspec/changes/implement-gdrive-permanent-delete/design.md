# Design: implement-gdrive-permanent-delete

## Backend
### Endpoint (probable)
If needed after audit:
- `DELETE /api/gdrive/accounts/{account}/files/{fileId}/permanent`
- or an equivalent route after review.

### Controller
- Add a controller method to handle the permanent delete request.

### Service
- `GoogleDriveService` likely needs a method such as:
  - `deletePermanent(GDriveAccount $account, string $fileId)`
  - or reuse naming like `deleteFile` + permanent flag.

## Frontend
### Service
- `frontend/src/services/gdriveService.ts` needs a function like:
  - `deleteGDriveFilePermanently(accountId, fileId)`

### UI Integration
- `frontend/src/app/pages/GDrive.tsx` renders file actions in a dropdown.
- Add an action **only when** `driveListMode === "trash"`.

### Safety / Confirmation
- Before calling the API, show a confirmation dialog using a simple browser confirm, e.g.:
  - `window.confirm(...)`
- If user cancels, **do not** call the API.

### Refresh behavior
- On success: call `setRefreshTick((v) => v + 1)`.
- On error: show an error state (either a dedicated delete-permanent error state or reuse the existing trash error style).

### Constraints (UI)
- Do not change dropdown positioning / click-outside / Escape behavior.
- Do not change layout row/header/actions column structure.

### Correct account selection
- The action must use the **clicked item’s** accountId (e.g. `file.accountId`) and must not rely on `activeAccountId` as a fallback.



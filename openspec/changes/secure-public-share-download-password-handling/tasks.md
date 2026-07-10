# Secure public-share download password handling — Implementation Tasks

## 1) Read-only confirmation
- [ ] Confirm current public share routes and controller behavior.
- [ ] Confirm current frontend download flow and query-string password usage.

## 2) Backend route changes
- [ ] Add `POST /api/share/{token}/download` to `backend/routes/api.php`.
- [ ] Extend `ShareController::download()` or add a separate handler to accept POST body password.
- [ ] Preserve existing GET download support for unprotected shares.

## 3) Backend validation
- [ ] Reuse current share token and file lookup logic.
- [ ] Preserve trashed/missing file handling.
- [ ] Preserve expiration handling.
- [ ] Preserve password validation behavior.
- [ ] Preserve download count increment and binary response.
- [ ] Ensure Content-Disposition continues to use original file name.

## 4) Frontend protection flow
- [ ] Update `frontend/src/app/pages/PublicSharePage.tsx` to use POST body for protected downloads.
- [ ] Ensure password is not included in any URL or query string.
- [ ] Preserve existing unprotected GET download behavior where practical.

## 5) Blob download implementation
- [ ] If using blob POST:
  - [ ] request uses `responseType: 'blob'`
  - [ ] parse `Content-Disposition` for filename
  - [ ] create an object URL
  - [ ] create a temporary anchor and trigger download
  - [ ] remove temporary anchor after use
  - [ ] revoke object URL after download
  - [ ] block duplicate downloads while active
  - [ ] map response errors to user-facing messages

## 6) Error handling
- [ ] Preserve existing wrong-password UI.
- [ ] Preserve expired/invalid share UI.
- [ ] Prevent browser navigation to raw JSON on failure.

## 7) Cleanup and verification
- [ ] Verify password never appears in URL.
- [ ] Verify password is not persisted to any storage.
- [ ] Verify no database migration is added.
- [ ] Validate final diff is limited to the intended files.
- [ ] Update project docs only if explicitly requested later.

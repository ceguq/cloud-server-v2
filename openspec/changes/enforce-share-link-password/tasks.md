# Tasks: Enforce share link password protection

- [x] Audit current ShareController password behavior.
- [x] Confirm ShareLink model hidden/casts behavior.
- [x] Patch backend share creation password hashing if needed.
- [x] Patch public share metadata response to include requires_password safely.
- [x] Patch public share download password validation.
- [x] Patch frontend PublicSharePage password prompt/submit flow if needed.
- [x] Ensure Shared.tsx does not expose stored password/hash.
- [ ] Add/update manual verification checklist:
  - [x] Create share link without password and confirm public download works.
  - [x] Create share link with password.
  - [x] Open protected public link and confirm metadata/download is blocked or gated.
  - [x] Try wrong password and confirm rejected.
  - [x] Try correct password and confirm download works.
  - [x] Confirm expired share link remains blocked.
  - [x] Run backend tests manually.
  - [x] Run frontend build manually.

> Final security audit passed. `ShareLink` password hash is hidden from JSON serialization. `Shared.tsx` does not expose password/hash. Expired public links remain blocked before password validation. Backend tests and frontend build passed manually.

> Note: Access history, allowed users, and blocking individual visitors/users are not part of this change and should be handled by a separate future OpenSpec.

> Note: Access history, allowed users, and blocking individual visitors/users are not part of this change and should be handled by a separate future OpenSpec.

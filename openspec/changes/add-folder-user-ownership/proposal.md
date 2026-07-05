# Proposal: Add folder user ownership

## Problem
Folders are currently stored without explicit per-user ownership, so folder listing, creation, move, rename, delete, restore, and storage counting can behave globally or inconsistently compared with files that already have user ownership. This creates multi-user safety issues in shared environments and makes folder operations harder to reason about.

## Goals
- Make folders explicitly owned by the authenticated user.
- Ensure folder operations are scoped to the current user rather than acting on global folder records.
- Reduce the chance of one user accessing or mutating another user's folders through folder-based flows.
- Keep the change practical and compatible with existing folder IDs and file relationships.

## Non-goals
- Reworking the full folder UI experience.
- Implementing cross-user folder sharing or collaboration.
- Automatically moving existing files between users.
- Changing public-share behavior.

## Impacted areas
- Backend database and models for folders.
- Folder-related controllers and API routes for listing, create, move, rename, trash, restore, and delete.
- File move/upload validation that references folders.
- Storage and trash flows that include folders.
- Frontend folder browsing and management flows in My Files.
- Tests and manual verification.

## Risks
- Existing folders may need a safe backfill strategy so they are not left without an owner.
- Parent-child folder moves need validation to prevent a user placing a folder under another user's folder.
- Restore and permanent delete flows must remain owner-scoped to avoid leaking trashed folders across users.
- A migration that changes ownership semantics may affect existing data if not handled carefully.

## Rollout plan
1. Add a migration for folder ownership and backfill existing data safely.
2. Update backend logic to filter and validate folder access by the authenticated user.
3. Verify folder create, move, rename, trash, restore, and storage-related behavior with targeted testing or manual checks.
4. Release after confirming existing folder IDs remain stable and no unexpected file moves are introduced.

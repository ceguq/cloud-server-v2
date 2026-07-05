# Design: Add folder user ownership

## Current behavior summary
- The folders table currently has no explicit user owner column.
- Folder listing, creation, rename, move, trash, restore, and delete operations are not clearly scoped to the authenticated user.
- Files already use user ownership, but folder-based flows can still operate on global folder records.
- The frontend already relies on folder APIs for My Files actions, so folder ownership gaps can surface as inconsistent behavior across create, move, rename, delete, restore, and storage counts.

## Target behavior
- Every folder should have an owner recorded via a user_id value.
- Folder-based API operations should be scoped to the authenticated user's owned folders.
- Folder moves and file-to-folder moves should validate that the target folder belongs to the same user.
- Trash restore and permanent delete for folders should remain limited to the owner's trashed folders.
- The frontend should continue to work with the existing API shape unless a response contract change becomes necessary.

## Database change plan
- Add a user_id column to folders.
- Link folders.user_id to users.id with a foreign key.
- Backfill existing folders safely using a conservative strategy that assigns ownership when a clear owner can be determined from existing file ownership or other reliable signals; otherwise leave them in a safe fallback state until explicitly assigned.
- Add an index on folders.user_id to support per-user queries.

## Backend logic plan
- Folder queries must filter by auth()->id() so listing and search only show the current user's folders.
- Creating a folder must set user_id from the authenticated user.
- Moving a folder must validate that the target parent folder belongs to the same user.
- Moving a file into a folder must validate that the target folder belongs to the same user.
- Trash restore and delete operations for folders must remain scoped to the folder owner.

## Frontend plan
- Prefer no UI changes unless the API response shape changes in a way that requires adaptation.
- Keep My Files folder interactions compatible with the existing behavior and existing folder IDs.

## Compatibility notes
- Existing folder IDs should remain stable.
- Existing files should not be moved automatically unless a migration or follow-up change explicitly requires it.

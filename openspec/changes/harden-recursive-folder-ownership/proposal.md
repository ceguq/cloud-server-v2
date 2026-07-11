# Proposal: Harden recursive folder ownership

## Problem
- Folder user ownership already exists and normal folder CRUD is mostly user-scoped.
- Legacy or malformed folder trees may contain descendants with missing or different user_id values.
- Recursive delete, restore, and force-delete operations must never cross into folders or files belonging to another user.
- Existing folder.user_id remains nullable, so recursive code must fail safely when ownership is unresolved.

## Scope
- Backend local folders only.
- Authenticated user-scoped recursive operations.
- No route changes.
- No frontend changes.
- No schema changes.
- No existing migration edits.
- No owner backfill in this phase.
- No non-null enforcement in this phase.

## Required behavior
1. Every recursive folder operation must remain inside the authenticated user’s ownership boundary.
2. Recursive operations must not modify:
   - a descendant folder owned by another user
   - a descendant file owned by another user
   - unresolved/null-owned descendant folders unless current code can prove safe ownership through the selected root
3. Preferred safety behavior:
   - abort before mutating any rows if the selected subtree contains ownership conflicts
   - return 404 or 422 using existing project conventions
   - do not partially mutate the subtree before discovering a conflict
4. Root folder ownership must be checked against the authenticated user.
5. Descendant folder queries must explicitly scope by user_id.
6. Descendant file queries must explicitly scope by user_id.
7. File upload and file move ownership checks remain unchanged, but receive regression coverage.
8. Normal same-user nested folder operations continue to work.
9. No route changes.
10. No migration in Phase 1.
11. Explicitly document that:
   - existing nullable folder.user_id remains a legacy-data concern
   - ownership backfill will be handled in a separate follow-up OpenSpec
   - existing migration files must not be edited
   - a future migration may backfill and later enforce non-null after validation

## Non-goals
- Ownership backfill.
- Non-null enforcement.
- Frontend redesign.
- Route changes.
- Migration edits.

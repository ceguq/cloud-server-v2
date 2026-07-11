# Design: Harden recursive folder ownership

## Overview
Add a small, security-focused ownership gate for recursive folder operations so a user cannot mutate another user’s subtree through soft delete, restore, or force delete.

## Phase 1 approach
- Keep the change backend-only and narrow to local folders.
- Reuse the existing folder controller flow rather than introducing a broad service abstraction.
- Validate the full subtree before any mutation occurs.
- Use explicit user-scoped queries for descendant folders and descendant files.
- Preserve current API response shapes where possible.

## Implementation pattern
- Add a small helper in the relevant controller path to inspect the selected root folder and all descendant folders/files before mutation.
- Treat unresolved or mixed ownership as a safety failure.
- Abort the entire operation before any soft delete, restore, or force-delete mutation if a conflict is found.
- Return 404 or 422 using the existing project conventions for invalid ownership.

## Scope boundaries
- No route changes.
- No frontend changes.
- No schema changes.
- No edits to existing migrations.
- No ownership backfill in this phase.
- No non-null enforcement in this phase.

## Compatibility notes
- Existing nullable folder.user_id remains a legacy-data concern.
- Same-user recursive operations remain supported.
- File upload and file move ownership checks remain unchanged and gain regression coverage.

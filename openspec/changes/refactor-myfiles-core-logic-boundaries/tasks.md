# Refactor MyFiles Core Logic Boundaries - Tasks

**Status:** Planning  
**Date:** 2026-07-06

## Stage 1 — Read-only audit

- [ ] Audit the current MyFiles.tsx implementation after the completed UI extraction work.
- [ ] Identify remaining state groups, handlers, API calls, and helper clusters.
- [ ] Recommend exactly one first safe logic extraction.

## Stage 2 — Safe helper extraction

- [ ] Extract only pure helper functions if a safe boundary is found.
- [ ] Do not move state unless it has been audited.
- [ ] Preserve existing behavior and validation flow.

## Stage 3 — Hook extraction candidates

- [ ] Extract one hook at a time only after audit.
- [ ] Candidate hooks may include useMyFilesSelection, useMyFilesMenus, useMyFilesMoveState, useMyFilesShareState, or similar names, but final names will be based on the actual code audit.
- [ ] Keep API behavior unchanged.

## Stage 4 — Validation

- [ ] Perform manual npm run build after every patch.
- [ ] Perform manual smoke-test of My Files core flows.
- [ ] Do not archive the change until tasks and validation remain consistent.

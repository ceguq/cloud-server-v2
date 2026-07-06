# Refactor MyFiles Core Logic Boundaries - Tasks

**Status:** Planning  
**Date:** 2026-07-06

## Stage 1 — Read-only audit

- [ ] Audit the current MyFiles.tsx implementation after the completed UI extraction work.
- [ ] Identify remaining state groups, handlers, API calls, and helper clusters.
- [ ] Recommend exactly one first safe logic extraction.

## Stage 2 — Safe helper extraction

- [x] Extract shared menu positioning helper.
- [x] Move only pure coordinate calculation into the new helper module.
- [x] Keep menu state, refs, click-outside behavior, action callbacks, and UI behavior owned by MyFiles.tsx.
- [x] Extract shared selection Set toggle helper.
- [x] Move only pure Set toggle logic into the new helper module.
- [x] Extract shared visible-selection apply helper.
- [x] Move only pure add/delete visible ID Set logic into the new helper module.
- [x] Extract shared selection Set removal helper.
- [x] Move only pure Set removal logic into the new helper module.
- [x] Keep selection state, checklist mode state, visible ID calculation, navigation reset behavior, bulk action behavior, drag/drop behavior, and API behavior owned by MyFiles.tsx.
- [ ] Do not move state unless it has been audited.
- [ ] Preserve existing behavior and validation flow.
- [ ] Extract one hook at a time only after audit.
- [ ] Perform manual npm run build after the patch.

## Stage 3 — Hook extraction candidates

- [ ] Extract one hook at a time only after audit.
- [ ] Candidate hooks may include useMyFilesSelection, useMyFilesMenus, useMyFilesMoveState, useMyFilesShareState, or similar names, but final names will be based on the actual code audit.
- [ ] Keep API behavior unchanged.

## Stage 4 — Validation

- [ ] Perform manual npm run build after every patch.
- [ ] Perform manual smoke-test of My Files core flows.
- [ ] Do not archive the change until tasks and validation remain consistent.

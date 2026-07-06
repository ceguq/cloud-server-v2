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
- [x] Extract move modal state-value helpers.
- [x] Move only pure move modal open/close/reset state value construction into the new helper module.
- [x] Extract folder modal state-value helpers.
- [x] Move only pure folder modal open/close/reset state value construction into the new helper module.
- [x] Keep useState ownership, setState application, selectedFolderForAction, submitFolderModal, API calls, refresh logic, modal rendering, and async behavior owned by MyFiles.tsx.
- [ ] Do not move state unless it has been audited.
- [ ] Preserve existing behavior and validation flow.
- [ ] Extract one hook at a time only after audit.
- [ ] Perform manual npm run build after the patch.

## Stage 3 — Hook extraction candidates

- [x] Extract focused useMyFilesSelection hook.
- [x] Move only selection/checklist state and local selection helpers into the new hook.
- [x] Keep bulk async actions, API calls, navigation/data loading, modal state, preview state, and action menu state owned by MyFiles.tsx.
- [x] Extract focused useMyFilesActionMenus hook.
- [x] Move only file/folder action menu state, menu refs, menu position state, open/close handlers, and click-outside behavior into the new hook.
- [x] Keep file/folder action callbacks, API calls, modal state, preview state, data loading/navigation, and selection state outside this hook.
- [ ] Candidate hooks may include useMyFilesSelection, useMyFilesMenus, useMyFilesMoveState, useMyFilesShareState, or similar names, but final names will be based on the actual code audit.
- [ ] Keep API behavior unchanged.

## Stage 4 — Validation

- [ ] Perform manual npm run build after every patch.
- [ ] Perform manual smoke-test of My Files core flows.
- [ ] Do not archive the change until tasks and validation remain consistent.

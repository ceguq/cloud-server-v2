# Refactor MyFiles Core Logic Boundaries - Design

**Status:** Planning  
**Date:** 2026-07-06

## Staged Plan

The refactor will proceed in small, auditable steps so that logic extraction remains safe and reviewable.

### Stage 1 — Read-only audit

- Review the current MyFiles.tsx implementation after the completed UI extraction work.
- Identify remaining state groups, handlers, helper clusters, and API call boundaries.
- Select exactly one first safe logic extraction candidate based on the audit.

### Stage 2 — Safe helper extraction

- Extract only pure helper functions when a safe boundary is identified.
- Keep state movement limited until a hook extraction has been explicitly audited.
- Avoid changing runtime behavior, API usage, or validation flow.

### Stage 3 — Hook extraction candidates

- Extract one hook at a time only after audit.
- Candidate hooks may include names such as useMyFilesSelection, useMyFilesMenus, useMyFilesMoveState, useMyFilesShareState, or similar names, but the final names will be based on the actual audit.
- Keep API behavior unchanged and preserve existing parent-owned behavior.

### Stage 4 — Validation

- Run manual build validation after every patch.
- Smoke-test core My Files flows after each patch.
- Do not archive the change until the tasks and validation steps remain consistent with the implementation.

## Candidate Future Boundaries

The following areas are good candidates for later extraction once the audit confirms they are safe:

- selection/checklist state helpers or hook
- file/folder action menu state helpers or hook
- move/share/delete modal state helpers where safe
- preview state helpers where safe, excluding risky image zoom/pan extraction by default
- data loading/refresh orchestration hook only after audit

## Guardrails

- Each extraction must be done one small patch at a time.
- Parent-owned behavior and API calls must not move unless explicitly audited.
- Build validation is required after every patch.
- No UI/UX/API behavior changes are intended.
- The image preview branch should remain in MyFiles.tsx unless a later audit proves a safe boundary.

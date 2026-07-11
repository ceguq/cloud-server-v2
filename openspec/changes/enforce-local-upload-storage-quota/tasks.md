# Tasks: Enforce local upload storage quota

## Backend implementation
- [x] Add a small quota constant/helper in the smallest appropriate backend location.
- [x] Add a pre-write quota check in FileController upload flow.
- [x] Preserve existing file validation and folder ownership checks.

## Verification
- [x] Verify syntax manually.
- [x] Verify route behavior manually.
- [x] Add focused feature tests for quota enforcement.

## Scope guardrails
- [x] Keep scope backend-only.
- [x] No frontend behavior changes.
- [x] No route changes.
- [x] No migration.

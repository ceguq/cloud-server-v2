# Tasks: Harden recursive folder ownership

## Phase 1 implementation
- [x] Add subtree ownership validation for recursive folder operations.
- [x] Apply ownership validation before soft-delete mutations.
- [x] Apply ownership validation before restore mutations.
- [x] Apply ownership validation before force-delete mutations.
- [x] Add focused backend feature tests for cross-user recursive operations.
- [x] Verify same-user recursive delete/restore/force-delete behavior still works.
- [x] Leave ownership backfill and non-null enforcement for a separate follow-up change.
- [x] Leave PROJECT_STRUCTURE.md updates for a later documentation step.

## Acceptance criteria
- [ ] A user cannot create a folder under another user’s folder.
- [ ] A user cannot rename or move another user’s folder.
- [ ] A user cannot move a folder into another user’s folder.
- [ ] Upload into another user’s folder is rejected.
- [ ] Move file into another user’s folder is rejected.
- [ ] Recursive soft delete refuses mixed-owner descendants.
- [ ] Recursive restore refuses mixed-owner descendants.
- [ ] Recursive force delete refuses mixed-owner descendants.
- [ ] Same-user recursive operations still succeed.
- [ ] Failed mixed-owner operations do not partially change rows.

## Notes
- Existing nullable folder.user_id remains a legacy-data concern.
- Ownership backfill and non-null enforcement are deferred to a later OpenSpec.
- Existing migration files must not be edited in this phase.

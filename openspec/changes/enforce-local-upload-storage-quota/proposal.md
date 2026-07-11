# Proposal: Enforce local upload storage quota

## Problem
- StorageController reports a hardcoded 100 GB per-user quota.
- File upload currently enforces only a 1 GB per-file limit.
- Uploads can exceed the reported quota because no remaining-capacity check exists.
- File is written to disk before database record creation.

## Scope
- Backend local file upload only.
- User-scoped quota.
- No frontend quota prediction.
- No migration.
- No config/env refactor.
- No concurrent reservation system in this first patch.

## Non-goals
- No frontend behavior changes.
- No route changes.
- No migration.
- No broad refactor or reservation/locking system.

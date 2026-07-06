# Refactor MyFiles Core Logic Boundaries - Proposal

**Status:** Planning  
**Date:** 2026-07-06  
**Author:** Copilot AI

## Why

The MyFiles page still carries too much orchestration responsibility after the recent UI extraction work. The main page file remains heavily involved in state coordination, handler wiring, and helper-driven logic even though the visible UI has already been split into smaller components. That makes future changes harder to audit and increases the risk of regressions when behavior must be adjusted.

## What Changes

This change continues the MyFiles refactor by focusing on logic and state boundaries rather than visual component extraction. The goal is to move safe logic and state clusters into dedicated hooks or helper modules while preserving current behavior.

The effort will focus on the following candidate boundaries:

- selection/checklist state helpers or hook
- file/folder action menu state helpers or hook
- move/share/delete modal state helpers where safe
- preview state helpers where safe, excluding risky image zoom/pan extraction by default
- data loading/refresh orchestration hook only after audit

The work will be done one small patch at a time, with each extraction reviewed for safety before it proceeds. No UI/UX/API behavior changes are intended. The image preview branch should remain in MyFiles.tsx unless a later audit proves a safe boundary.

## Impact

This change is expected to make MyFiles.tsx a thinner page-level orchestrator and main controller without changing current My Files behavior. It should reduce page complexity and make future refactors more reviewable while preserving existing API calls, validation flow, and user-facing behavior. Parent-owned behavior and API calls will not be moved unless they are explicitly audited and confirmed to be safe.

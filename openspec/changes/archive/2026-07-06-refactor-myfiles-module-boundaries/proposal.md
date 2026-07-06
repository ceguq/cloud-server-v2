# Refactor MyFiles Module Boundaries - Proposal

**Status:** Planning  
**Date:** 2026-07-05  
**Author:** Copilot AI  

## Problem Statement

The `frontend/src/app/pages/MyFiles.tsx` file has grown to approximately **5,000 lines**, making it difficult to maintain, test, and reason about. The file contains:

- State management for multiple concerns (files, folders, navigation, search, modals)
- Multiple modal workflows (share, move, delete, preview, rename)
- File/folder operation handlers (create, rename, delete, move, download)
- UI rendering for grid and list views
- Action menu positioning and logic
- Integration with UploadManagerContext
- Theme and styling utilities

This single file handles too many responsibilities, which increases the risk of regressions and makes it harder for developers to locate and modify specific features.

## Goal

Safely refactor `MyFiles.tsx` into smaller, focused module boundaries **without changing behavior**. This is a **staged refactor** where:

1. We extract low-risk pure helpers and simple components first
2. We gradually move toward extracting state management and modal flows
3. Each stage is validated before proceeding to the next
4. **Behavior must remain identical** - users should notice no difference
5. All existing features must continue to work:
   - File/folder listing
   - Upload integration
   - Share link creation with password protection
   - Checklist/selection mode
   - File/folder ownership behavior
   - Drag-drop move operations
   - Preview functionality (images, text, audio)
   - Search and filtering

## Non-Goals

- API behavior changes (backend remains untouched)
- UI redesign or refactoring
- Feature additions
- Performance optimization (not the focus of this refactor)

## Success Criteria

1. MyFiles.tsx is significantly smaller (target: <2,000 lines in main component)
2. Each extracted module has a single, clear responsibility
3. No regression in functionality - all smoke tests pass
4. Type safety is maintained throughout
5. Code is easier to understand and modify
6. All existing features remain operational

## Approach

**Staged Extraction (Future Implementation):**

1. **Stage 1:** Extract pure types and utility functions (low risk, high value)
2. **Stage 2:** Extract simple presentational components (low risk)
3. **Stage 3:** Extract toolbar and view rendering components (medium risk)
4. **Stage 4:** Extract action menu and dropdown logic (medium risk)
5. **Stage 5:** Extract modal components and their state (higher risk)
6. **Stage 6:** Extract remaining state management into custom hooks
7. **Stage 7:** Final cleanup and simplification

Each stage will:
- Define clear module boundaries
- Document dependencies
- Verify no behavior changes
- Include comprehensive testing/validation

## Timeline

- **Current:** OpenSpec creation and planning
- **Next:** Audit confirmation and staging breakdown
- **Implementation:** Staged refactor based on risk levels
- **Validation:** Smoke tests, manual verification, regression testing

---

**Next Steps:**
1. Review and approve this proposal
2. Review design document with proposed module structure
3. Begin Stage 1 implementation (pure types/utils extraction)

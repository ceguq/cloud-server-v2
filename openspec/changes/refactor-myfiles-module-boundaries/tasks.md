# Refactor MyFiles Module Boundaries - Tasks

**Status:** Planning  
**Date:** 2026-07-05  

## Overview

This document tracks the implementation of the MyFiles.tsx refactor using a staged approach. Each stage has specific tasks and validation steps. Stages should not proceed until the previous stage is complete and validated.

---

## Phase 0: Planning & Audit ✅ COMPLETE

- [x] **Audit current MyFiles.tsx responsibilities**
  - Identified 8 major responsibility areas
  - Mapped existing extractions
  - Identified safe candidates for extraction
  
- [x] **Create OpenSpec proposal**
  - Documented problem statement
  - Defined goals and success criteria
  - Approved staged approach
  
- [x] **Create design document**
  - Defined module structure
  - Documented extraction stages
  - Identified risk areas and mitigations
  
- [x] **Create task breakdown**
  - This document

---

## Stage 1: Types & Utilities (SAFEST) ✅ COMPLETE

**Goal:** Consolidate all types and verify utility modules are complete.  
**Risk Level:** ⚠️ Very Low  
**Duration:** 1-2 days  

### Tasks

- [x] **1.1 Create/consolidate `types.ts`**
  - [ ] Move `FileTypeFilterValue` type
  - [ ] Move `SortBy`, `SortDirection` types
  - [ ] Move `AppearanceTheme`, `ResolvedTheme` types
  - [ ] Move `ViewMode` type
  - [ ] Add modal-specific types (share, move, delete, preview)
  - [ ] Add state types for all modals
  - [ ] Update imports in MyFiles.tsx
  
  > Note: Extracted only type-level definitions into `frontend/src/app/pages/my-files/types.ts`. `MyFiles.tsx` now imports those definitions via a type-only import. No runtime logic, JSX, handlers, state, styling, API calls, or backend behavior was moved.

- [ ] **1.2 Audit existing utility modules**
  - [ ] Verify `myFilesSorting.ts` is complete
  - [ ] Verify `myFilesFilters.ts` is complete
  - [ ] Verify `myFilesFormatters.ts` is complete
  - [ ] Verify `myFilesPreviewUtils.ts` is complete
  - [ ] Verify `myFilesThemeUtils.ts` is complete
  - [ ] Verify `myFilesDomUtils.ts` is complete
  - [ ] Verify `myFilesShareUtils.ts` is complete
  - [ ] Verify `myFilesMenuUtils.ts` is complete

- [ ] **1.3 Create `navigation.ts` utility (if needed)**
  - [ ] Extract folder breadcrumb helpers
  - [ ] Extract folder navigation helpers
  - [ ] Add types for breadcrumb items

- [ ] **1.4 Update imports in MyFiles.tsx**
  - [ ] Import types from `types.ts`
  - [ ] Verify TypeScript compilation succeeds
  - [ ] No runtime changes

### Validation

- [ ] TypeScript strict mode passes
- [ ] No new compiler errors or warnings
- [ ] MyFiles.tsx still renders identically
- [ ] No behavior changes
- [ ] Git diff shows only import reorganization

---

## Stage 2: Simple Components (SAFE) ⏳ NOT STARTED

**Goal:** Extract simple, low-dependency components.  
**Risk Level:** ⚠️ Low  
**Duration:** 2-3 days  

### Tasks

- [ ] **2.1 Create `MyFilesToolbar.tsx` component**
  - [ ] Extract search field component
  - [ ] Extract filter dropdown
  - [ ] Extract sort dropdown
  - [ ] Extract view mode toggle (or import existing)
  - [ ] Verify all toolbar controls work
  - [ ] Test keyboard navigation

- [ ] **2.2 Create empty/loading states**
  - [ ] Extract `MyFilesEmptyFolderState.tsx`
  - [ ] Extract `MyFilesEmptySearchState.tsx`
  - [ ] Extract `MyFilesEmptyFilterState.tsx`
  - [ ] Extract `MyFilesLoadingState.tsx`
  - [ ] Verify states display correctly
  - [ ] Verify styling consistency

- [ ] **2.3 Update MyFiles.tsx imports**
  - [ ] Import new toolbar component
  - [ ] Import empty/loading state components
  - [ ] Verify rendering still works
  - [ ] No visual regressions

### Validation

- [ ] Visual regression tests pass (toolbar, empty states)
- [ ] Toolbar interactions work (search, filter, sort, view toggle)
- [ ] Empty/loading states render correctly in all conditions
- [ ] TypeScript compilation succeeds
- [ ] No behavior changes

---

## Stage 3: List & Grid Rendering (MEDIUM) ⏳ NOT STARTED

**Goal:** Extract file/folder list and grid rendering logic.  
**Risk Level:** ⚠️ Medium  
**Duration:** 3-4 days  

### Tasks

- [ ] **3.1 Create `MyFilesList.tsx` component**
  - [ ] Extract list view rendering logic
  - [ ] Handle file item rendering
  - [ ] Handle folder item rendering
  - [ ] Support selection checkboxes
  - [ ] Support item actions (right-click menu)
  - [ ] Test scrolling and virtualization (if used)
  - [ ] Verify styles apply correctly

- [ ] **3.2 Create `MyFilesGrid.tsx` component**
  - [ ] Extract grid view rendering logic
  - [ ] Handle file item rendering in grid
  - [ ] Handle folder item rendering in grid
  - [ ] Support selection checkboxes
  - [ ] Support item actions (right-click menu)
  - [ ] Test grid layout responsiveness
  - [ ] Verify hover states and interactions

- [ ] **3.3 Update MyFiles.tsx**
  - [ ] Import list and grid components
  - [ ] Replace inline rendering with components
  - [ ] Test list view toggle
  - [ ] Test grid view toggle
  - [ ] Verify selections still work
  - [ ] Verify drag-drop still works (if list/grid supports it)

### Validation

- [ ] Visual regression tests pass (list and grid views)
- [ ] List view displays all items with correct styling
- [ ] Grid view displays all items with correct layout
- [ ] View mode toggle switches between list and grid
- [ ] Item selection works in both views
- [ ] Scrolling and lazy-loading work (if applicable)
- [ ] Responsive design works on mobile/tablet
- [ ] TypeScript compilation succeeds
- [ ] No behavior changes
- [ ] Manual smoke test: list items render correctly

---

## Stage 4: Action Menu (MEDIUM) ⏳ NOT STARTED

**Goal:** Extract file/folder action menu with positioning.  
**Risk Level:** ⚠️ Medium  
**Duration:** 2-3 days  

### Tasks

- [ ] **4.1 Create `MyFilesActionMenu.tsx` component**
  - [ ] Extract file action menu rendering
  - [ ] Extract folder action menu rendering
  - [ ] Implement positioning logic (from `myFilesMenuUtils.ts`)
  - [ ] Handle viewport edge cases (menu repositioning)
  - [ ] Support keyboard navigation (arrow keys, Escape)
  - [ ] Support mouse hover and click
  - [ ] Test with multiple viewport sizes

- [ ] **4.2 Create action handlers in component**
  - [ ] Handle rename action
  - [ ] Handle delete action
  - [ ] Handle move action
  - [ ] Handle share action
  - [ ] Handle download action
  - [ ] Handle preview action
  - [ ] Delegate back to parent callbacks

- [ ] **4.3 Update MyFiles.tsx**
  - [ ] Import action menu component
  - [ ] Pass action handlers to component
  - [ ] Replace inline menu rendering
  - [ ] Test menu positioning with multiple items
  - [ ] Test edge cases (bottom-right, left edge, etc.)

### Validation

- [ ] Visual regression tests pass (action menu)
- [ ] Action menu appears at cursor when right-clicked
- [ ] Menu doesn't go off-screen (viewport-aware)
- [ ] Menu closes when clicked outside
- [ ] Menu closes when item is clicked
- [ ] Keyboard navigation works (Escape, arrows)
- [ ] All action callbacks fire correctly
- [ ] TypeScript compilation succeeds
- [ ] No behavior changes
- [ ] Manual smoke test: right-click on files and folders

---

## Stage 5: Simple Modals (MEDIUM-HIGH) ⏳ NOT STARTED

**Goal:** Extract simple modal components with their state.  
**Risk Level:** ⚠️ Medium-High  
**Duration:** 3-4 days  

### Tasks

- [ ] **5.1 Create `RenameModal.tsx`**
  - [ ] Extract rename modal UI
  - [ ] Extract rename file handler
  - [ ] Extract rename folder handler
  - [ ] Handle form validation
  - [ ] Handle error display
  - [ ] Test keyboard (Enter to submit, Escape to cancel)

- [ ] **5.2 Create `CreateFolderModal.tsx`**
  - [ ] Extract create folder modal UI
  - [ ] Extract create handler
  - [ ] Handle form validation
  - [ ] Handle error display
  - [ ] Test keyboard interactions

- [ ] **5.3 Create simple delete confirmation `DeleteModal.tsx`**
  - [ ] Extract delete confirmation UI (single item)
  - [ ] Support file delete
  - [ ] Support folder delete
  - [ ] Bulk delete in separate modal or same?
  - [ ] Test confirmation flow

- [ ] **5.4 Extract modal state hooks**
  - [ ] Create `useRenameModal.ts` hook
  - [ ] Create `useCreateFolderModal.ts` hook
  - [ ] Create `useDeleteModal.ts` hook
  - [ ] Move modal state from MyFiles.tsx
  - [ ] Keep handlers in modals or move?

- [ ] **5.5 Update MyFiles.tsx**
  - [ ] Import modal components
  - [ ] Replace inline modals with components
  - [ ] Pass state and handlers to modals
  - [ ] Test modal workflows

### Validation

- [ ] Each modal opens and closes correctly
- [ ] Form validation works
- [ ] Error messages display correctly
- [ ] Keyboard interactions work (Enter, Escape)
- [ ] Rename modal renames files correctly
- [ ] Rename modal renames folders correctly
- [ ] Create folder modal creates folders
- [ ] Delete modal deletes files and folders
- [ ] TypeScript compilation succeeds
- [ ] No behavior changes
- [ ] Manual smoke test: rename, create, delete operations

---

## Stage 6: Complex Modals (HIGH) ⏳ NOT STARTED

**Goal:** Extract complex modals (share, move, preview).  
**Risk Level:** ⚠️ High  
**Duration:** 4-5 days  

### Tasks

- [ ] **6.1 Create `ShareModal.tsx`**
  - [ ] Extract share link modal UI
  - [ ] Extract share mode toggle (private/shared)
  - [ ] Extract password input and validation
  - [ ] Extract public link display and copy button
  - [ ] **CRITICAL:** Password protection must work identically
  - [ ] Test link creation with password
  - [ ] Test link deletion
  - [ ] Test mode switching (private ↔ shared)

- [ ] **6.2 Create `useShareOperations.ts` hook**
  - [ ] Extract share state management
  - [ ] Extract `createShareLink` handler
  - [ ] Extract `deleteShareLink` handler
  - [ ] Extract `getExistingShareLink` handler
  - [ ] Move share modal state from MyFiles.tsx

- [ ] **6.3 Create `MoveModal.tsx`**
  - [ ] Extract move modal UI
  - [ ] Extract folder selection dropdown
  - [ ] Extract bulk move logic
  - [ ] Support move files (single and bulk)
  - [ ] Support move folders (single and bulk)
  - [ ] Prevent moving folder into itself
  - [ ] Test move validation

- [ ] **6.4 Create `useMoveOperations.ts` hook**
  - [ ] Extract move state management
  - [ ] Extract move handlers
  - [ ] Move modal state from MyFiles.tsx

- [ ] **6.5 Create `PreviewModal.tsx` with sub-components**
  - [ ] Extract preview modal UI
  - [ ] Extract image preview (with zoom)
  - [ ] Extract text preview
  - [ ] Extract audio preview
  - [ ] Extract preview header and actions
  - [ ] Test zoom controls
  - [ ] Test keyboard navigation
  - [ ] Test prev/next file navigation

- [ ] **6.6 Create `usePreviewState.ts` hook**
  - [ ] Extract preview state management
  - [ ] Extract zoom calculations
  - [ ] Extract preview mode transitions (normal/maximized/minimized)
  - [ ] Extract keyboard handlers
  - [ ] Move preview modal state from MyFiles.tsx

- [ ] **6.7 Update MyFiles.tsx**
  - [ ] Import complex modal components
  - [ ] Replace inline modals with components
  - [ ] Pass state and handlers to modals
  - [ ] Test all modal workflows

### Validation

- [ ] Share modal opens and closes correctly
- [ ] **Share password protection works identically** (HIGH PRIORITY)
- [ ] Public link can be created, viewed, and deleted
- [ ] Link copy to clipboard works
- [ ] Mode switching works (private → shared → private)
- [ ] Move modal displays correct target folders
- [ ] Move operations succeed for files and folders
- [ ] Bulk move works
- [ ] Cannot move folder into itself
- [ ] Preview modal opens for supported file types
- [ ] Image preview zoom works (in/out, scroll wheel)
- [ ] Text preview displays and scrolls correctly
- [ ] Audio preview player works
- [ ] Preview keyboard navigation works (arrow keys, Escape)
- [ ] TypeScript compilation succeeds
- [ ] **No regression in share password flow** (HIGH PRIORITY)
- [ ] Manual smoke test: all modal workflows

---

## Stage 7: State Consolidation (HIGH) ⏳ NOT STARTED

**Goal:** Extract remaining state into custom hooks and simplify main component.  
**Risk Level:** ⚠️ High  
**Duration:** 2-3 days  

### Tasks

- [ ] **7.1 Create `useFileOperations.ts` hook**
  - [ ] Extract file state management (files, loading, error)
  - [ ] Extract `loadFiles` handler
  - [ ] Extract file operation callbacks
  - [ ] Move file-related state from MyFiles.tsx

- [ ] **7.2 Create `useFolderOperations.ts` hook**
  - [ ] Extract folder state management
  - [ ] Extract `loadFolders` handler
  - [ ] Extract breadcrumb state and handlers
  - [ ] Extract folder navigation handlers
  - [ ] Move folder-related state from MyFiles.tsx

- [ ] **7.3 Create `useSelection.ts` hook**
  - [ ] Extract file selection state
  - [ ] Extract folder selection state
  - [ ] Extract selection mode state
  - [ ] Extract bulk operation handlers (delete, move, download)
  - [ ] Move selection-related state from MyFiles.tsx

- [ ] **7.4 Create `useTheme.ts` hook**
  - [ ] Extract appearance theme state
  - [ ] Extract accent color state
  - [ ] Extract resolved theme state
  - [ ] Move theme-related state from MyFiles.tsx

- [ ] **7.5 Consolidate remaining state**
  - [ ] Extract view mode state (grid/list toggle)
  - [ ] Extract search query state
  - [ ] Extract sort state
  - [ ] Extract filter state
  - [ ] Extract drag-drop state

- [ ] **7.6 Refactor MyFiles.tsx**
  - [ ] Import all custom hooks
  - [ ] Replace direct state management with hooks
  - [ ] Simplify main component logic
  - [ ] Verify component size < 600 lines (target)
  - [ ] Test all functionality still works

### Validation

- [ ] All state is properly extracted into hooks
- [ ] Hooks are composable and reusable
- [ ] Main component is significantly smaller (< 600 lines)
- [ ] TypeScript compilation succeeds
- [ ] No behavior changes
- [ ] All modals and features still work
- [ ] Manual smoke test: complete user workflow

---

## Post-Implementation Validation

### Comprehensive Smoke Test (After All Stages)

**Run before closing this change:**

- [ ] **Navigation & Display**
  - [ ] [ ] View My Files (list view displays correctly)
  - [ ] [ ] View My Files (grid view displays correctly)
  - [ ] [ ] Toggle between list and grid view
  - [ ] [ ] Navigate folders (click folder, navigate back, breadcrumbs work)
  - [ ] [ ] Navigate to root
  - [ ] [ ] Breadcrumbs clickable and functional

- [ ] **Search & Filtering**
  - [ ] [ ] Search by filename (results display)
  - [ ] [ ] Search highlights matches (if applicable)
  - [ ] [ ] Filter by file type (all, images, documents, etc.)
  - [ ] [ ] Filter + search combination works
  - [ ] [ ] Sort by name, date, size, type
  - [ ] [ ] Sort ascending and descending

- [ ] **File Operations**
  - [ ] [ ] Upload file (file appears in list)
  - [ ] [ ] Upload folder (if supported)
  - [ ] [ ] Create folder (folder appears in list)
  - [ ] [ ] Rename file (via modal, name updates)
  - [ ] [ ] Rename folder (via modal, name updates)
  - [ ] [ ] Move file to different folder
  - [ ] [ ] Move folder to different folder
  - [ ] [ ] Move multiple files (bulk move)
  - [ ] [ ] Delete file (moves to trash)
  - [ ] [ ] Delete folder (moves to trash)
  - [ ] [ ] Delete multiple files (bulk delete)
  - [ ] [ ] Download file
  - [ ] [ ] Download multiple files (bulk download)

- [ ] **Selection & Bulk Actions**
  - [ ] [ ] Enable selection mode (checkbox appears)
  - [ ] [ ] Select/deselect individual items
  - [ ] [ ] Select all items
  - [ ] [ ] Deselect all items
  - [ ] [ ] Selection count displays correctly
  - [ ] [ ] Bulk delete selected items
  - [ ] [ ] Bulk move selected items
  - [ ] [ ] Bulk download selected items

- [ ] **Share Links**
  - [ ] [ ] Create share link (public link is generated)
  - [ ] [ ] View public share link (URL is correct)
  - [ ] [ ] Copy share link to clipboard
  - [ ] [ ] Create share link with password (password protection enabled)
  - [ ] [ ] Update share link password
  - [ ] [ ] Delete share link (private mode)
  - [ ] [ ] Test public download with password (if testable)

- [ ] **File Preview**
  - [ ] [ ] Preview image file (displays with zoom controls)
  - [ ] [ ] Zoom in/out on image (scroll wheel, buttons)
  - [ ] [ ] Pan image (if zoomed)
  - [ ] [ ] Preview text file (displays content)
  - [ ] [ ] Preview audio file (player works)
  - [ ] [ ] Close preview modal
  - [ ] [ ] Keyboard: Escape to close preview
  - [ ] [ ] Keyboard: Arrow keys to navigate files

- [ ] **Action Menu (Right-Click)**
  - [ ] [ ] Right-click file (menu appears)
  - [ ] [ ] Right-click folder (menu appears)
  - [ ] [ ] Menu positioned correctly (not off-screen)
  - [ ] [ ] Click action (menu closes, action executes)
  - [ ] [ ] Click outside menu (menu closes)
  - [ ] [ ] Keyboard: Escape to close menu

- [ ] **Upload Integration**
  - [ ] [ ] Upload file appears in upload tray
  - [ ] [ ] Upload progress displays
  - [ ] [ ] Upload completes successfully
  - [ ] [ ] File appears in file list after upload
  - [ ] [ ] Failed upload shows error
  - [ ] [ ] Cancel upload works
  - [ ] [ ] Retry failed upload

- [ ] **Theme & Styling**
  - [ ] [ ] Appearance theme respected (dark/light/system)
  - [ ] [ ] Accent color applies to UI elements
  - [ ] [ ] Hover states work
  - [ ] [ ] Focus states work (keyboard navigation)
  - [ ] [ ] Responsive design (mobile/tablet/desktop)

- [ ] **Edge Cases**
  - [ ] [ ] Empty folder displays "empty" state
  - [ ] [ ] Search with no results displays "no results" state
  - [ ] [ ] Filter with no results displays "no results" state
  - [ ] [ ] Large file list scrolls smoothly
  - [ ] [ ] Rapid navigation doesn't cause errors
  - [ ] [ ] File operations during search maintain results
  - [ ] [ ] Delete item clears it from selection

### Code Quality Checks

- [ ] TypeScript strict mode passes
- [ ] No ESLint warnings or errors
- [ ] No console errors during normal usage
- [ ] No memory leaks (dev tools profiler)
- [ ] Performance is acceptable (no noticeable lag)
- [ ] Accessibility: keyboard navigation works
- [ ] Accessibility: screen reader friendly (if applicable)

---

## Rollback Plan

If critical issues are found after implementation:

1. **Identify issue stage** (which stage caused the regression)
2. **Revert that stage** back to previous working state
3. **Debug and fix** the specific issue
4. **Re-implement** stage with fix
5. **Re-validate** the stage

If rollback is needed after all stages:
- Use git to revert to pre-refactor commit
- Return to using unrefactored MyFiles.tsx
- Document issues for future approach

---

## Sign-Off

**Planning Complete:** 2026-07-05  
**Ready for Stage 1:** [ ] Awaiting approval  
**Stage 1 Start Date:** [ ] TBD  
**Expected Completion:** [ ] TBD (2-3 weeks with all stages)  

---

**Next Steps:**
1. Review tasks with team
2. Approve task breakdown
3. Begin Stage 1 when ready
4. Update this document as stages complete

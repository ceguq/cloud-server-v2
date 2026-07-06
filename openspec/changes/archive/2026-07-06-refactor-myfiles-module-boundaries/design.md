# Refactor MyFiles Module Boundaries - Design

**Status:** Planning  
**Date:** 2026-07-05  

## Proposed Module Structure

After refactor, the MyFiles feature will have the following structure:

```
frontend/src/app/pages/
├── my-files/
│   ├── types.ts                      # All MyFiles-specific types & interfaces
│   ├── constants.ts                  # Constants (already partial)
│   ├── utils/
│   │   ├── sorting.ts               # Sort logic (already exists)
│   │   ├── filtering.ts             # Filter logic (already exists)
│   │   ├── formatters.ts            # Format helpers (already exists)
│   │   ├── preview.ts               # Preview utilities (already exists)
│   │   ├── theme.ts                 # Theme utilities (already exists)
│   │   ├── dom.ts                   # DOM utilities (already exists)
│   │   ├── share.ts                 # Share link helpers (already exists)
│   │   ├── menu.ts                  # Menu positioning (already exists)
│   │   └── navigation.ts            # NEW: Breadcrumb/folder nav helpers
│   ├── hooks/
│   │   ├── useFileOperations.ts      # NEW: File CRUD operations
│   │   ├── useFolderOperations.ts    # NEW: Folder CRUD operations
│   │   ├── useShareOperations.ts     # NEW: Share link operations
│   │   ├── useMoveOperations.ts      # NEW: Move file/folder logic
│   │   ├── useSelection.ts           # NEW: Checklist/selection mode
│   │   ├── usePreviewState.ts        # NEW: Preview modal state
│   │   └── useMyFilesState.ts        # NEW: Consolidated state hook (?)
│   ├── components/
│   │   ├── MyFilesToolbar.tsx        # NEW: Toolbar (search, filter, sort, view toggle)
│   │   ├── MyFilesBreadcrumbs.tsx    # EXISTING: Breadcrumb navigation
│   │   ├── MyFilesEmptyState.tsx     # NEW: Empty state variants
│   │   ├── MyFilesLoadingState.tsx   # NEW: Loading state
│   │   ├── MyFilesList.tsx           # NEW: List view rendering
│   │   ├── MyFilesGrid.tsx           # NEW: Grid view rendering
│   │   ├── MyFilesActionMenu.tsx     # NEW: File/folder action menu
│   │   ├── MyFilesModals/
│   │   │   ├── ShareModal.tsx        # NEW: Share link modal
│   │   │   ├── MoveModal.tsx         # NEW: Move file/folder modal
│   │   │   ├── DeleteModal.tsx       # NEW: Delete confirmation modal
│   │   │   ├── RenameModal.tsx       # NEW: Rename modal
│   │   │   ├── CreateFolderModal.tsx # NEW: Create folder modal
│   │   │   └── PreviewModal.tsx      # NEW: File preview modal
│   │   ├── ViewModeToggle.tsx        # EXISTING
│   │   ├── SelectionCountPill.tsx    # EXISTING
│   │   ├── PreviewHeaderActions.tsx  # EXISTING
│   │   ├── PreviewHeaderTitle.tsx    # EXISTING
│   │   ├── AudioPreviewPlayer.tsx    # EXISTING
│   │   └── ... (other existing components)
│   └── MyFiles.tsx                   # REFACTORED: Orchestration component (400-600 lines)
└── MyFiles.tsx                       # Entry point (thin wrapper)
```

## Module Responsibilities

### Types Module (`types.ts`)
**Consolidates all MyFiles-specific types**
- `FileTypeFilterValue`
- `SortBy`, `SortDirection`
- `AppearanceTheme`, `ResolvedTheme`
- `ViewMode`
- Modal state types
- Any other MyFiles-specific interfaces

### Utility Modules (`utils/`)
**Pure functions with no side effects**
- Sorting, filtering, formatting (already exist)
- Preview helpers (already exist)
- DOM and menu utilities (already exist)
- NEW: Navigation helpers (folder breadcrumb tracking)

### Hooks (`hooks/`)
**State management and business logic**

#### `useFileOperations.ts`
- `loadFiles(folderId, search)`
- `renameFile(fileId, newName)`
- `deleteFile(fileId)`
- `downloadFile(fileId, fileName)`
- Manages file state and error handling

#### `useFolderOperations.ts`
- `loadFolders(parentId, search)`
- `createFolder(name, parentId)`
- `renameFolder(folderId, newName)`
- `deleteFolder(folderId)`
- `handleOpenFolder(folder)`
- `handleBackToRoot()`
- `handleBreadcrumbClick(id)`
- Manages folder state and breadcrumbs

#### `useShareOperations.ts`
- `createShareLink(fileId, password?)`
- `deleteShareLink(shareLinkId)`
- `getShareLinks()`
- Manages share modal state and operations

#### `useMoveOperations.ts`
- `moveFile(fileId, targetFolderId)`
- `moveFolder(folderId, targetFolderId)`
- `handleDragDrop(...)`
- Manages move modal state and validation

#### `useSelection.ts`
- `toggleFileSelection(fileId)`
- `toggleFolderSelection(folderId)`
- `clearSelection()`
- `bulkDelete()`, `bulkMove()`, `bulkDownload()`
- Manages checklist state for files and folders

#### `usePreviewState.ts`
- Preview modal state (file, zoom, offset, mode)
- Text preview loading
- Image zoom calculations
- Preview mode transitions

### Components

#### Toolbar (`MyFilesToolbar.tsx`)
- Search field
- Filter dropdown
- Sort dropdown
- View mode toggle
- Bulk action buttons

#### Empty/Loading States
- Empty folder
- Empty search results
- Empty filter results
- Loading state

#### List/Grid Views (`MyFilesList.tsx`, `MyFilesGrid.tsx`)
- Render files and folders
- Handle item selection
- Delegate to action menu

#### Action Menu (`MyFilesActionMenu.tsx`)
- Show for files and folders
- Position correctly (fixed positioning, viewport-aware)
- Handle all actions (rename, delete, move, share, etc.)

#### Modals (in `MyFilesModals/`)
- Share link modal with password
- Move target selection modal
- Delete confirmation (single and bulk)
- Rename modal
- Create folder modal
- File preview modal (images, text, audio)

### Main Component (`my-files/MyFiles.tsx`)
**Orchestrates all modules**
- Combines hooks and utilities
- Manages top-level state
- Handles integration with UploadManagerContext
- Renders toolbar, list/grid, action menu, modals
- Approx. 400-600 lines (down from 5,000)

### Entry Point (`pages/MyFiles.tsx`)
**Thin wrapper**
- Provides props from page context
- Instantiates the component

## Extraction Stages

### Stage 1: Types & Utils (SAFEST)
**Risk Level:** ⚠️ Very Low
- Move all types to `types.ts`
- Verify existing utility modules are complete
- Add `navigation.ts` utility if needed
- **Validation:** TypeScript compilation, no runtime change

### Stage 2: Simple Components (SAFE)
**Risk Level:** ⚠️ Low
- Extract empty/loading states
- Extract toolbar components (search, filter, sort, view toggle)
- Already extracted: breadcrumb, selection pill
- **Validation:** Visual regression test, toolbar interactions

### Stage 3: List/Grid Rendering (MEDIUM)
**Risk Level:** ⚠️ Medium
- Extract `MyFilesList.tsx` (list view rendering)
- Extract `MyFilesGrid.tsx` (grid view rendering)
- Keep state management in parent
- **Validation:** Visual regression, grid/list toggle, scrolling

### Stage 4: Action Menu (MEDIUM)
**Risk Level:** ⚠️ Medium
- Extract `MyFilesActionMenu.tsx`
- Test positioning doesn't break (must handle viewport edges)
- Test all action handlers still work
- **Validation:** Right-click menus, keyboard nav, positioning edge cases

### Stage 5: Simple Modals (MEDIUM-HIGH)
**Risk Level:** ⚠️ Medium-High
- Extract simple modals: Rename, Create Folder, Delete confirmation
- Each modal gets its own hook
- **Validation:** Modal open/close, form validation, error handling

### Stage 6: Complex Modals (HIGH)
**Risk Level:** ⚠️ High
- Extract Share modal (password protection must not regress)
- Extract Move modal (folder selection, bulk move)
- Extract Preview modal (zoom handling, keyboard interactions)
- **Validation:** Share link creation, password verification, preview interactions

### Stage 7: State Consolidation (HIGH)
**Risk Level:** ⚠️ High
- Extract all state into custom hooks
- Create `useMyFilesState.ts` to consolidate state
- Refactor main component to use hooks
- **Validation:** Full smoke test suite, no behavioral regression

## Risk Mitigation Strategies

### Action Menu Positioning
**Risk:** Menu disappears or breaks when near viewport edges  
**Mitigation:** Move positioning logic to `myFilesMenuUtils.ts`, test with multiple viewport sizes

### Upload Flow Integration
**Risk:** Upload flow breaks or stops showing progress  
**Mitigation:** Keep UploadManagerContext usage isolated, test with file uploads

### Share Password Flow
**Risk:** Password protection fails or accepts invalid input  
**Mitigation:** Extract password validation to utility, maintain same validation logic

### Checklist Selection
**Risk:** Selection state becomes inconsistent between files and folders  
**Mitigation:** Consolidate selection logic in `useSelection.ts`, clear selection on folder change

### File/Folder Ownership
**Risk:** User permissions or file ownership rules regress  
**Mitigation:** No changes to API calls or service usage, visual-only refactor

### Preview Functionality
**Risk:** Zoom, keyboard nav, or interactions break  
**Mitigation:** Keep preview image zoom logic in `usePreviewState.ts`, test all interactions

### Search + Filter Combination
**Risk:** Search and filter interact incorrectly  
**Mitigation:** No changes to search/filter logic, only extract rendering

## Dependencies & Boundaries

### External Dependencies
- `fileService` - file API calls
- `folderService` - folder API calls
- `shareService` - share link API calls
- `UploadManagerContext` - upload queue management
- Lucide React icons
- Tailwind CSS
- Radix/shadcn components

### Internal Dependencies
- Utilities (sorting, filtering, formatting, theme)
- Components (breadcrumb, empty states, preview, etc.)
- Types (file, folder, share models)

### State Flow
```
MyFiles.tsx (orchestrator)
├── useFileOperations → fileService
├── useFolderOperations → folderService
├── useShareOperations → shareService
├── useMoveOperations → folderService/fileService
├── useSelection → selection state
└── usePreviewState → preview state
```

## Backward Compatibility

- All public APIs remain identical
- Props passed to `MyFiles` component unchanged
- Export path remains `pages/MyFiles.tsx`
- No changes to service interfaces
- No changes to UploadManagerContext usage

## Phased Implementation Timeline

| Phase | Focus | Duration | Risk |
|-------|-------|----------|------|
| 1 | Types & utils | 1-2 days | Very Low |
| 2 | Simple components | 2-3 days | Low |
| 3 | List/grid views | 3-4 days | Medium |
| 4 | Action menu | 2-3 days | Medium |
| 5 | Simple modals | 3-4 days | Medium-High |
| 6 | Complex modals | 4-5 days | High |
| 7 | State cleanup | 2-3 days | High |

**Total estimated:** 2-3 weeks with thorough testing between stages.

---

**Next Steps:**
1. Approve this design document
2. Proceed with Stage 1 (types and utils)
3. Schedule reviews between stages

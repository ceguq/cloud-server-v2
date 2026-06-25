# Proposal: Add “Files” tab filter (hide folders) in GDrive page

## Problem
User needs a fast way to see only Drive file items (non-folder) for the currently active Google Drive account, without folders.

## Goal
Add a new tab named **Files** positioned immediately to the right of **All Files**. When active, the UI must display only non-folder items.

## Non-goals
- Backend rewrite / API changes.
- Multi-account merge or cross-account aggregation.
- Changing existing behavior of **All Files**, **Starred**, **Shared**, or **Recent**.
- Changing upload/trash/restore/permanent delete behavior.
- Changing preview/download/action menu/right-click/grid-list logic.
- Changing rowKey/id separation.


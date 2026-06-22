# Proposal: implement-gdrive-permanent-delete

## Problem
Google Drive file/folder items that are already in **Trash** cannot be deleted permanently from the UI NimbusDrive.

## Goal
Add a **Delete Permanently** action for items shown in **Trash** mode.

### Non-goals
- Do not change upload behavior.
- Do not change preview behavior.
- Do not change restore behavior.
- Do not change list-files behavior.
- Do not change OAuth flow yet.
- Do not implement bulk delete.
- Do not implement delete-permanently from **Files** mode.

## Scope
- The **Delete Permanently** action is shown **only** in **Trash** mode.
- The action must require user confirmation before executing (destructive).
- After successful deletion, refresh the Trash list.



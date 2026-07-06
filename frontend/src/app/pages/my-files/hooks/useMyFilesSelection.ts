import { useCallback, useMemo, useState } from "react";
import {
  applyVisibleSelection,
  removeSetValues,
  toggleSetValue,
} from "../myFilesSelectionUtils";

export function useMyFilesSelection() {
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const clearFileSelection = useCallback(() => {
    setSelectedFileIds(new Set());
  }, []);

  const clearFolderSelection = useCallback(() => {
    setSelectedFolderIds(new Set());
  }, []);

  const clearSelection = useCallback(() => {
    clearFileSelection();
    clearFolderSelection();
  }, [clearFileSelection, clearFolderSelection]);

  const toggleSelectionMode = useCallback(() => {
    setIsSelectionMode((current) => {
      if (current) {
        clearSelection();
      }

      return !current;
    });
  }, [clearSelection]);

  const toggleFileSelection = useCallback((fileId: string) => {
    setSelectedFileIds((prev) => toggleSetValue(prev, fileId));
  }, []);

  const toggleFolderSelection = useCallback((folderId: string) => {
    setSelectedFolderIds((prev) => toggleSetValue(prev, folderId));
  }, []);

  const applyVisibleFileSelection = useCallback((visibleFileIds: Iterable<string>, shouldSelect: boolean) => {
    setSelectedFileIds((prev) => applyVisibleSelection(prev, visibleFileIds, shouldSelect));
  }, []);

  const applyVisibleFolderSelection = useCallback((visibleFolderIds: Iterable<string>, shouldSelect: boolean) => {
    setSelectedFolderIds((prev) => applyVisibleSelection(prev, visibleFolderIds, shouldSelect));
  }, []);

  const removeSelectedFiles = useCallback((fileIds: Iterable<string>) => {
    setSelectedFileIds((prev) => removeSetValues(prev, fileIds));
  }, []);

  const removeSelectedFolders = useCallback((folderIds: Iterable<string>) => {
    setSelectedFolderIds((prev) => removeSetValues(prev, folderIds));
  }, []);

  const checklistVisibilityStyle = useMemo(
    () => ({
      visibility: isSelectionMode ? "visible" : "hidden",
      pointerEvents: isSelectionMode ? "auto" : "none",
    }) as const,
    [isSelectionMode],
  );

  return {
    selectedFileIds,
    selectedFolderIds,
    isSelectionMode,
    checklistVisibilityStyle,
    toggleFileSelection,
    toggleFolderSelection,
    applyVisibleFileSelection,
    applyVisibleFolderSelection,
    removeSelectedFiles,
    removeSelectedFolders,
    clearFileSelection,
    clearFolderSelection,
    clearSelection,
    toggleSelectionMode,
  };
}

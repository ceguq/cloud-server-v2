import type { FileModel } from "../../services/fileService";
import type { Folder as FolderModel } from "../../services/folderService";
import type { MoveItemType } from "./types";

export type MoveModalStatePatch = {
  moveModalOpen: boolean;
  moveItemType: MoveItemType | null;
  moveItemId: string | null;
  moveItemName: string;
  moveFileIds: string[];
  moveTargetFolderId: string | null;
  moveError: string;
};

export function getClosedMoveModalState(): MoveModalStatePatch {
  return {
    moveModalOpen: false,
    moveItemType: null,
    moveItemId: null,
    moveItemName: "",
    moveFileIds: [],
    moveTargetFolderId: null,
    moveError: "",
  };
}

export function getFileMoveModalState(
  file: FileModel,
  selectedFileIds: Iterable<string> = [],
): MoveModalStatePatch {
  const selectedIds = Array.from(selectedFileIds);
  const isBulkEligible = selectedIds.length > 1 && selectedIds.includes(file.id);

  return {
    moveModalOpen: true,
    moveItemType: "file",
    moveItemId: file.id,
    moveFileIds: isBulkEligible ? selectedIds : [file.id],
    moveItemName: isBulkEligible
      ? `${selectedIds.length} files selected`
      : file.original_name ?? "Untitled file",
    moveTargetFolderId: null,
    moveError: "",
  };
}

export function getFolderMoveModalState(folder: FolderModel): MoveModalStatePatch {
  return {
    moveModalOpen: true,
    moveItemType: "folder",
    moveItemId: folder.id,
    moveItemName: folder.name ?? "Untitled folder",
    moveFileIds: [],
    moveTargetFolderId: null,
    moveError: "",
  };
}

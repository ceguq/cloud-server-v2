import type { Folder as FolderModel } from "../../services/folderService";

export type FolderModalStatePatch = {
  isFolderModalOpen: boolean;
  folderModalMode: "create" | "rename";
  folderModalName: string;
  folderModalError: string;
};

export function getCreateFolderModalState(): FolderModalStatePatch {
  return {
    isFolderModalOpen: true,
    folderModalMode: "create",
    folderModalName: "",
    folderModalError: "",
  };
}

export function getRenameFolderModalState(folder: FolderModel): FolderModalStatePatch {
  return {
    isFolderModalOpen: true,
    folderModalMode: "rename",
    folderModalName: folder.name,
    folderModalError: "",
  };
}

export function getClosedFolderModalState(): FolderModalStatePatch {
  return {
    isFolderModalOpen: false,
    folderModalMode: "create",
    folderModalName: "",
    folderModalError: "",
  };
}

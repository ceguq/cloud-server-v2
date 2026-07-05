import type { Folder as FolderModel } from "../../services/folderService";
import type { FileModel } from "../../services/fileService";

export type MyFilesProps = {
  filesRefreshKey?: number;
  onStorageChanged?: () => void;
};

export type ViewMode = "grid" | "list";

export type MenuCoordinate = {
  x: number;
  y: number;
};

export type DragMoveItem = {
  type: "file" | "folder";
  id: string;
  name: string;
  fileIds?: string[];
  folderIds?: string[];
};

export type FileActionFeedback = {
  fileId: string;
  type: "success" | "error";
  message: string;
};

export type DetailsItem =
  | { type: "file"; item: FileModel }
  | { type: "folder"; item: FolderModel };

export type PreviewModalMode = "normal" | "maximized" | "minimized";
export type ShareMode = "private" | "shared";
export type MoveItemType = "file" | "folder";

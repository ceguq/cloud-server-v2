import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { calculateActionMenuPosition } from "../myFilesMenuPositioning";
import type { MenuCoordinate } from "../types";

const FILE_MENU_WIDTH = 260;
const FILE_MENU_HEIGHT = 430;
const FOLDER_MENU_WIDTH = 180;
const FOLDER_MENU_HEIGHT = 180;

export function useMyFilesActionMenus() {
  const [openFolderActionId, setOpenFolderActionId] = useState<string | null>(null);
  const [openFileActionId, setOpenFileActionId] = useState<string | null>(null);
  const [fileActionMenuPosition, setFileActionMenuPosition] = useState<MenuCoordinate | null>(null);
  const [folderActionMenuPosition, setFolderActionMenuPosition] = useState<MenuCoordinate | null>(null);

  const fileMenuWrapRef = useRef<HTMLDivElement | null>(null);
  const folderMenuWrapRef = useRef<HTMLDivElement | null>(null);

  const closeFileActionMenu = useCallback(() => {
    setOpenFileActionId(null);
    setFileActionMenuPosition(null);
  }, []);

  const closeFolderActionMenu = useCallback(() => {
    setOpenFolderActionId(null);
    setFolderActionMenuPosition(null);
  }, []);

  const openFolderMenuAtCursor = useCallback(
    (event: ReactMouseEvent<Element>, folderId: string) => {
      event.preventDefault();
      event.stopPropagation();

      setOpenFileActionId(null);
      setFileActionMenuPosition(null);

      setOpenFolderActionId(folderId);
      setFolderActionMenuPosition(
        calculateActionMenuPosition({
          clientX: event.clientX,
          clientY: event.clientY,
          menuWidth: FOLDER_MENU_WIDTH,
          menuHeight: FOLDER_MENU_HEIGHT,
        }),
      );
    },
    [],
  );

  const openFileMenuAtCursor = useCallback(
    (event: ReactMouseEvent<Element>, fileId: string) => {
      event.preventDefault();
      event.stopPropagation();

      setOpenFolderActionId(null);
      setFolderActionMenuPosition(null);

      if (openFileActionId === fileId) {
        closeFileActionMenu();
        return;
      }

      const rect = event.currentTarget.getBoundingClientRect();
      const left =
        typeof window !== "undefined"
          ? Math.min(
              window.innerWidth - FILE_MENU_WIDTH - 12,
              Math.max(12, rect.right - FILE_MENU_WIDTH),
            )
          : rect.right - FILE_MENU_WIDTH;
      const top =
        typeof window !== "undefined"
          ? Math.min(window.innerHeight - FILE_MENU_HEIGHT, rect.bottom + 6)
          : rect.bottom + 6;

      setOpenFileActionId(fileId);
      setFileActionMenuPosition(
        calculateActionMenuPosition({
          clientX: left,
          clientY: top,
          menuWidth: FILE_MENU_WIDTH,
          menuHeight: FILE_MENU_HEIGHT,
          padding: 8,
          viewportWidth: typeof window !== "undefined" ? window.innerWidth - 12 : undefined,
          viewportHeight: typeof window !== "undefined" ? window.innerHeight : undefined,
        }),
      );
    },
    [closeFileActionMenu, openFileActionId],
  );

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;

      if (openFileActionId !== null) {
        const wrap = fileMenuWrapRef.current;
        if (!wrap) {
          closeFileActionMenu();
        } else if (!wrap.contains(target)) {
          closeFileActionMenu();
        }
      }

      if (openFolderActionId !== null) {
        const wrap = folderMenuWrapRef.current;
        if (!wrap) {
          closeFolderActionMenu();
        } else if (!wrap.contains(target)) {
          closeFolderActionMenu();
        }
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [closeFileActionMenu, closeFolderActionMenu, openFileActionId, openFolderActionId]);

  return {
    openFileActionId,
    openFolderActionId,
    fileActionMenuPosition,
    folderActionMenuPosition,
    fileMenuWrapRef,
    folderMenuWrapRef,
    openFileMenuAtCursor,
    openFolderMenuAtCursor,
    closeFileActionMenu,
    closeFolderActionMenu,
  };
}

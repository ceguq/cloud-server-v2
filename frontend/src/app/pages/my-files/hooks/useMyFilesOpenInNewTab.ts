import { useCallback, useState } from "react";
import fileService, { type FileModel } from "../../../../services/fileService";

export function useMyFilesOpenInNewTab() {
  const [openingFileId, setOpeningFileId] = useState<string | null>(null);

  const openFileInNewTab = useCallback(async (file: FileModel) => {
    if (!file) return false;

    setOpeningFileId(file.id);

    let popup: Window | null = window.open("about:blank", "_blank");
    let objectUrl: string | null = null;

    try {
      const { blob } = await fileService.getFilePreviewBlob(file.id);
      objectUrl = window.URL.createObjectURL(blob);

      if (popup) {
        popup.opener = null;
        popup.location.href = objectUrl;
      } else {
        window.open(objectUrl, "_blank", "noopener,noreferrer");
      }

      window.setTimeout(() => {
        if (objectUrl) {
          window.URL.revokeObjectURL(objectUrl);
        }
      }, 60_000);

      return true;
    } catch (error) {
      console.error("Failed to open file in new tab", error);

      if (popup) {
        try {
          popup.document.title = "File preview unavailable";
          popup.document.body.innerHTML = "<div style=\"font-family:sans-serif;padding:16px;\">Unable to open this file.</div>";
        } catch {
          // Ignore tab-write errors.
        }
      }

      return false;
    } finally {
      setOpeningFileId(null);
    }
  }, []);

  return { openFileInNewTab, openingFileId };
}

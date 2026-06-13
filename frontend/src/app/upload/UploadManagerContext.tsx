import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import fileService from "../../services/fileService";

export type UploadItemStatus =
  | "queued"
  | "uploading"
  | "completed"
  | "failed"
  | "cancelled";

export type UploadQueueItem = {
  id: string;
  file: File;
  fileName: string;
  size: number;
  folderId: string | null;
  progress: number; // 0-100
  status: UploadItemStatus;
  errorMessage?: string;
  // internal flags
  _progressIndeterminate?: boolean;
  // Track server-side file ID for cleanup on cancel
  fileId?: string;
};

type AddFilesFn = (files: File[], folderId?: string | null) => void;

type UploadManagerContextValue = {
  addFiles: AddFilesFn;
  items: UploadQueueItem[];
  hasActiveUploads: boolean;
  retryItem: (id: string) => void;
  cancelItem: (id: string) => void;
  removeCompletedItems: () => void;
  // UI-only helpers (no change to upload processing/AbortController)
  clearAllFinalItems: () => void;
  closeTray: () => void;
  isTrayVisible: boolean;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  // Track last successful upload for UI refresh triggers
  lastUploadCompleteTime: number;
};

const UploadManagerContext = createContext<UploadManagerContextValue | null>(
  null,
);

function formatBytes(bytes: number): string {
  const v = typeof bytes === "number" ? bytes : 0;
  if (v === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(
    Math.floor(Math.log(v) / Math.log(1024)),
    units.length - 1,
  );
  const num = v / Math.pow(1024, i);
  const fixed = num >= 10 ? 1 : 2;
  return `${num.toFixed(fixed)} ${units[i]}`;
}

function createLocalId() {
  return `up_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function useUploadManager() {
  const ctx = useContext(UploadManagerContext);
  if (!ctx) throw new Error("useUploadManager must be used within provider");
  return ctx;
}

export function UploadManagerProvider({
  children,
  onUploadCompleted,
}: {
  children: React.ReactNode;
  onUploadCompleted?: (didCompleteAny: boolean) => void;
}) {
  const [items, setItems] = useState<UploadQueueItem[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [isTrayVisible, setIsTrayVisible] = useState(false);
  const [lastUploadCompleteTime, setLastUploadCompleteTime] = useState(0);

  const processingRef = useRef(false);
  const queueRef = useRef<UploadQueueItem[]>([]);

  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

  // keep queueRef in sync
  queueRef.current = items;

  const hasActiveUploads = useMemo(() => {
    return items.some((i) => i.status === "queued" || i.status === "uploading");
  }, [items]);

  const updateItem = useCallback(
    (id: string, patch: Partial<UploadQueueItem>) => {
      setItems((prev) =>
        prev.map((it) => (it.id === id ? { ...it, ...patch } : it)),
      );
    },
    [],
  );

  const findNextQueuedItem = useCallback(() => {
    return queueRef.current.find((it) => it.status === "queued");
  }, []);

  const uploadOne = useCallback(
    async (itemId: string) => {
      const current = queueRef.current.find((i) => i.id === itemId);

      if (!current) return false;

      updateItem(itemId, {
        status: "uploading",
        progress: current.progress ?? 0,
        errorMessage: undefined,
        _progressIndeterminate: false,
      });

      const folderId = current.folderId;

      let lastKnownProgress = 0;
      let indeterminate = false;

      const abortController = new AbortController();
      abortControllersRef.current.set(itemId, abortController);

      try {
        const uploadedFile = await fileService.uploadFile(
          current.file,
          folderId,
          (progressEvent: any) => {
            const loaded =
              typeof progressEvent?.loaded === "number"
                ? progressEvent.loaded
                : null;
            const total =
              typeof progressEvent?.total === "number"
                ? progressEvent.total
                : null;

            if (loaded == null || total == null || total <= 0) {
              indeterminate = true;
              updateItem(itemId, {
                _progressIndeterminate: true,
              });
              return;
            }

            const pct = Math.max(
              0,
              Math.min(100, Math.round((loaded / total) * 100)),
            );
            lastKnownProgress = pct;
            updateItem(itemId, {
              progress: pct,
              _progressIndeterminate: indeterminate,
            });
          },
          abortController.signal,
        );

        updateItem(itemId, {
          status: "completed",
          progress: lastKnownProgress,
          _progressIndeterminate: false,
          errorMessage: undefined,
          fileId: uploadedFile?.id,
        });

        return true;
      } catch (err: any) {
        const isAbort =
          err?.name === "CanceledError" ||
          err?.code === "ERR_CANCELED" ||
          err?.message?.toLowerCase?.().includes("cancel") ||
          abortController.signal.aborted;

        if (isAbort) {
          updateItem(itemId, {
            status: "cancelled",
            errorMessage: undefined,
            _progressIndeterminate: false,
          });
        } else {
          const safeMsg =
            err?.response?.data?.message ||
            err?.response?.data?.errors?.file?.[0] ||
            err?.message ||
            "Gagal upload file.";

          updateItem(itemId, {
            status: "failed",
            errorMessage: safeMsg,
          });
        }

        return false;
      } finally {
        abortControllersRef.current.delete(itemId);
      }
    },
    [updateItem, onUploadCompleted],
  );

  const processQueue = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;

    try {
      let didCompleteAny = false;

      while (true) {
        const next = findNextQueuedItem();
        if (!next) break;
        const completed = await uploadOne(next.id);
        if (completed) {
          didCompleteAny = true;
          setLastUploadCompleteTime(Date.now());
          onUploadCompleted?.(true);
        }
      }

      if (!didCompleteAny) {
        onUploadCompleted?.(false);
      }
    } finally {
      processingRef.current = false;
    }
  }, [findNextQueuedItem, uploadOne, onUploadCompleted]);

  const addFiles = useCallback(
    (files: File[], folderId?: string | null) => {
      if (!files || files.length === 0) return;

      // tampilkan tray hanya saat user menambahkan upload baru
      setCollapsed(false);
      setIsTrayVisible(true);

      const folder = folderId ?? null;
      const newItems: UploadQueueItem[] = files.map((file) => ({
        id: createLocalId(),
        file,
        fileName: file.name,
        size: typeof file.size === "number" ? file.size : 0,
        folderId: folder,
        progress: 0,
        status: "queued",
      }));

      setItems((prev) => {
        const merged = [...prev, ...newItems];
        return merged;
      });

      queueMicrotask(() => {
        processQueue();
      });
    },
    [processQueue],
  );

  const retryItem = useCallback(
    (id: string) => {
      setItems((prev) =>
        prev.map((it) =>
          it.id === id
            ? { ...it, status: "queued", progress: 0, errorMessage: undefined }
            : it,
        ),
      );
      queueMicrotask(() => {
        processQueue();
      });
    },
    [processQueue],
  );

  const cancelItem = useCallback((id: string) => {
    const target = queueRef.current.find((i) => i.id === id);
    if (!target) return;

    if (target.status === "queued") {
      setItems((prev) =>
        prev.map((it) =>
          it.id === id
            ? { ...it, status: "cancelled", errorMessage: undefined }
            : it,
        ),
      );
      return;
    }

    if (target.status === "uploading") {
      const controller = abortControllersRef.current.get(id);
      controller?.abort();

      // If file was already created on server, request cancellation/cleanup
      if (target.fileId) {
        fileService.cancelUpload(target.fileId).catch((err) => {
          console.error("Failed to cleanup uploaded file:", err);
          // Don't prevent cancellation if cleanup fails
        });
      }

      setItems((prev) =>
        prev.map((it) => (it.id === id ? { ...it, status: "cancelled" } : it)),
      );
      return;
    }

    // For completed items, allow cleanup by calling cancelUpload
    if (target.status === "completed" && target.fileId) {
      fileService.cancelUpload(target.fileId).catch((err) => {
        console.error("Failed to cleanup uploaded file:", err);
      });

      setItems((prev) =>
        prev.map((it) => (it.id === id ? { ...it, status: "cancelled" } : it)),
      );
    }
  }, []);

  const removeCompletedItems = useCallback(() => {
    setItems((prev) => prev.filter((it) => it.status !== "completed"));
  }, []);

  // UI-only: remove final results when user closes the tray panel
  // (does NOT abort active uploads)
  const clearAllFinalItems = useCallback(() => {
    setItems((prev) =>
      prev.filter(
        (it) =>
          it.status !== "completed" &&
          it.status !== "failed" &&
          it.status !== "cancelled",
      ),
    );
  }, []);

  const closeTray = useCallback(() => {
    setIsTrayVisible(false);
  }, []);

  const value = useMemo<UploadManagerContextValue>(
    () => ({
      addFiles,
      items,
      hasActiveUploads,
      retryItem,
      cancelItem,
      removeCompletedItems,
      clearAllFinalItems,
      closeTray,
      isTrayVisible,
      collapsed,
      setCollapsed,
      lastUploadCompleteTime,
    }),
    [
      addFiles,
      items,
      hasActiveUploads,
      retryItem,
      cancelItem,
      removeCompletedItems,
      clearAllFinalItems,
      closeTray,
      collapsed,
      isTrayVisible,
      lastUploadCompleteTime,
    ],
  );

  return (
    <UploadManagerContext.Provider value={value}>
      {children}
    </UploadManagerContext.Provider>
  );
}

export function useUploadTrayStats() {
  const { items } = useUploadManager();
  const total = items.length;
  const activeCount = items.filter(
    (i) => i.status === "queued" || i.status === "uploading",
  ).length;
  const completedCount = items.filter((i) => i.status === "completed").length;
  const failedCount = items.filter((i) => i.status === "failed").length;

  return { total, activeCount, completedCount, failedCount, formatBytes };
}

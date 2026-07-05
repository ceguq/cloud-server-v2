import type { ChangeEvent, RefObject } from "react";
import { FolderPlus, Upload } from "lucide-react";
import type { ResolvedTheme } from "../myFilesThemeUtils";
import { InlineStatusMessage } from "./InlineStatusMessage";

export type MyFilesHeaderActionsProps = {
  uploadError: string;
  resolvedTheme: ResolvedTheme;
  accentColor: string;
  borderColor: string;
  hasActiveUploads: boolean;
  uploadInputRef: RefObject<HTMLInputElement | null>;
  onCreateFolder: () => void;
  onUploadInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onOpenUploadPicker: () => void;
};

export function MyFilesHeaderActions({
  uploadError,
  resolvedTheme,
  accentColor,
  borderColor,
  hasActiveUploads,
  uploadInputRef,
  onCreateFolder,
  onUploadInputChange,
  onOpenUploadPicker,
}: MyFilesHeaderActionsProps) {
  return (
    <div className="flex items-center gap-2">
      {uploadError && (
        <InlineStatusMessage
          message={uploadError}
          tone="error"
          role="alert"
          ariaLive="polite"
          textColor="#f87171"
          backgroundColor={
            resolvedTheme === "light"
              ? "rgba(248,113,113,0.08)"
              : "rgba(248,113,113,0.12)"
          }
          borderColor="rgba(248,113,113,0.35)"
        />
      )}

      <button
        type="button"
        onClick={onCreateFolder}
        aria-label="Create new folder"
        title="Create new folder"
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all hover:opacity-80"
        style={{
          background: "linear-gradient(135deg, " + accentColor + ", #22d3ee)",
          border: `1px solid ${borderColor}`,
          color: "#fff",
        }}
      >
        <FolderPlus size={13} /> New Folder
      </button>

      <input
        ref={uploadInputRef}
        type="file"
        multiple={true}
        style={{ display: "none" }}
        aria-label="Upload files"
        onChange={onUploadInputChange}
      />

      <button
        type="button"
        onClick={onOpenUploadPicker}
        aria-label="Upload Files"
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold"
        style={{
          background: "linear-gradient(135deg, " + accentColor + ", #22d3ee)",
          color: "#fff",
          opacity: hasActiveUploads ? 0.9 : 1,
        }}
        title="Upload Files"
      >
        <Upload size={13} />{" "}
        {hasActiveUploads ? "Tambah ke Queue" : "Upload Files"}
      </button>

      {uploadError && (
        <InlineStatusMessage
          message={uploadError}
          tone="error"
          role="status"
          ariaLive="polite"
          textColor="#f87171"
          backgroundColor={
            resolvedTheme === "light"
              ? "rgba(248,113,113,0.08)"
              : "rgba(248,113,113,0.12)"
          }
          borderColor="rgba(248,113,113,0.35)"
        />
      )}
    </div>
  );
}

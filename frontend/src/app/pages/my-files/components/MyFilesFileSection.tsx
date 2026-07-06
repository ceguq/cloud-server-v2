import type { CSSProperties, ReactNode } from "react";
import { EmptySearchState } from "./EmptySearchState";
import { LoadingSpinner } from "../../../components/LoadingSpinner";
import { SelectionCountPill } from "./SelectionCountPill";
import type { FileModel } from "../../../services/fileService";
import type { ViewMode } from "../types";

export type MyFilesFileSectionProps = {
  typedFiles: FileModel[];
  selectedFileIds: Set<string>;
  checklistVisibilityStyle: CSSProperties;
  showEmptySearchState: boolean;
  loadingFiles: boolean;
  fileError: string;
  viewMode: ViewMode;
  bulkDownloadLoading: boolean;
  bulkDeleteLoading: boolean;
  textColor: string;
  mutedColor: string;
  muted2Color: string;
  borderColor: string;
  buttonSoftBg: string;
  accentColor: string;
  renderListItems: () => ReactNode;
  renderGridItems: () => ReactNode;
  onToggleVisibleFiles: (checked: boolean, visibleFileIds: string[]) => void;
  onBulkDownload: () => void;
  onOpenBulkDeleteModal: () => void;
  onClearFileSelection: () => void;
};

export function MyFilesFileSection({
  typedFiles,
  selectedFileIds,
  checklistVisibilityStyle,
  showEmptySearchState,
  loadingFiles,
  fileError,
  viewMode,
  bulkDownloadLoading,
  bulkDeleteLoading,
  textColor,
  mutedColor,
  muted2Color,
  borderColor,
  buttonSoftBg,
  accentColor,
  renderListItems,
  renderGridItems,
  onToggleVisibleFiles,
  onBulkDownload,
  onOpenBulkDeleteModal,
  onClearFileSelection,
}: MyFilesFileSectionProps) {
  const visibleFileIds = typedFiles.map((file) => file.id);
  const selectedVisibleCount = visibleFileIds.reduce(
    (acc, id) => acc + (selectedFileIds.has(id) ? 1 : 0),
    0,
  );
  const allVisibleChecked =
    visibleFileIds.length > 0 && selectedVisibleCount === visibleFileIds.length;
  const someVisibleChecked =
    selectedVisibleCount > 0 && selectedVisibleCount < visibleFileIds.length;

  return (
    <div>
      {selectedFileIds.size > 0 && (
        <div
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3 px-4 py-3 rounded-xl"
          style={{
            background: "#0f1729",
            border: `1px solid ${borderColor}`,
            boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
          }}
        >
          <div className="text-xs" style={{ color: mutedColor }}>
            <span style={{ color: textColor, fontWeight: 700 }}>
              {selectedFileIds.size}
            </span>{" "}
            file dipilih
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="px-3 py-2 rounded-lg text-xs font-semibold"
              style={{
                background: `linear-gradient(135deg, ${accentColor}, #22d3ee)`,
                color: "#fff",
                border: `1px solid ${accentColor}55`,
              }}
              aria-label="Bulk Download"
              disabled={bulkDownloadLoading}
              onClick={onBulkDownload}
              onMouseEnter={(event) => {
                const element = event.currentTarget;
                element.style.filter = "brightness(1.02)";
              }}
              onMouseLeave={(event) => {
                const element = event.currentTarget;
                element.style.filter = "none";
              }}
            >
              {bulkDownloadLoading ? (
                <>
                  <LoadingSpinner size={12} /> Memproses...
                </>
              ) : (
                "Download"
              )}
            </button>

            <button
              type="button"
              className="px-3 py-2 rounded-lg text-xs font-semibold"
              style={{
                background: buttonSoftBg,
                border: `1px solid ${borderColor}`,
                color: textColor,
              }}
              aria-label="Bulk Share"
              onMouseEnter={(event) => {
                const element = event.currentTarget;
                element.style.background = `${accentColor}10`;
              }}
              onMouseLeave={(event) => {
                const element = event.currentTarget;
                element.style.background = buttonSoftBg;
              }}
              onClick={() => undefined}
            >
              Share
            </button>

            <button
              type="button"
              className="px-3 py-2 rounded-lg text-xs font-semibold"
              style={{
                background: "#f87171",
                border: "1px solid rgba(248,113,113,0.4)",
                color: "#080d1a",
              }}
              aria-label="Bulk Delete"
              onClick={onOpenBulkDeleteModal}
              onMouseEnter={(event) => {
                const element = event.currentTarget;
                element.style.background = "rgba(239,68,68,0.9)";
              }}
              onMouseLeave={(event) => {
                const element = event.currentTarget;
                element.style.background = "#f87171";
              }}
            >
              Delete
            </button>

            <button
              type="button"
              className="px-3 py-2 rounded-lg text-xs font-medium"
              style={{
                background: buttonSoftBg,
                border: `1px solid ${borderColor}`,
                color: textColor,
              }}
              aria-label="Batalkan pilihan"
              onMouseEnter={(event) => {
                const element = event.currentTarget;
                element.style.background = `${accentColor}10`;
              }}
              onMouseLeave={(event) => {
                const element = event.currentTarget;
                element.style.background = buttonSoftBg;
              }}
              onClick={onClearFileSelection}
            >
              Batalkan pilihan
            </button>
          </div>
        </div>
      )}

      <h3
        className="text-xs font-semibold mb-3 uppercase tracking-wider"
        style={{ color: "#334155" }}
      >
        Recent Files
      </h3>

      {loadingFiles && (
        <div className="flex items-center gap-2 text-xs mb-4" style={{ color: mutedColor }}>
          <LoadingSpinner size={12} />
          Memuat file...
        </div>
      )}
      {fileError && (
        <div className="text-xs mb-4" style={{ color: "#f87171" }}>
          {fileError}
        </div>
      )}

      {viewMode === "list" ? (
        <div className="flex flex-col gap-2">
          <div
            className="grid items-center gap-2 rounded-xl px-3 py-2"
            style={{
              gridTemplateColumns: "minmax(0, 36px) minmax(0, 1fr) 140px 140px 100px 90px 52px",
              background: "#0f1729",
              border: `1px solid ${borderColor}`,
            }}
          >
            <input
              type="checkbox"
              aria-label="Pilih semua file yang tampil"
              checked={allVisibleChecked}
              ref={(element) => {
                if (element) element.indeterminate = someVisibleChecked;
              }}
              onChange={(event) => {
                onToggleVisibleFiles(event.target.checked, visibleFileIds);
              }}
              onClick={(event) => event.stopPropagation()}
              style={{
                width: 14,
                height: 14,
                accentColor: "#ef4444",
                ...checklistVisibilityStyle,
              }}
            />

            <span
              className="text-[11px] font-medium uppercase tracking-wider"
              style={{ color: mutedColor, paddingLeft: 38 }}
            >
              Name
            </span>

            <span
              className="text-[11px] font-medium uppercase tracking-wider"
              style={{ color: mutedColor, justifySelf: "start", paddingLeft: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginLeft: -4 }}
            >
              Type
            </span>
            <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: mutedColor }}>
              Modified
            </span>
            <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: mutedColor }}>
              Size
            </span>
            <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: mutedColor }}>
              Status
            </span>
            <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: mutedColor }} />
          </div>

          {showEmptySearchState ? (
            <EmptySearchState searchQuery="" color={mutedColor} />
          ) : (
            renderListItems()
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {showEmptySearchState ? (
            <EmptySearchState searchQuery="" color={mutedColor} colSpanFull={true} />
          ) : (
            renderGridItems()
          )}
        </div>
      )}
    </div>
  );
}

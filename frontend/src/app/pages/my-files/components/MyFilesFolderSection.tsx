import type { CSSProperties, ReactNode } from "react";
import { EmptyFilterMessage } from "./EmptyFilterMessage";
import { EmptyFolderMessage } from "./EmptyFolderMessage";
import { LoadingFoldersMessage } from "./LoadingFoldersMessage";
import { SelectionCountPill } from "./SelectionCountPill";
import type { Folder as FolderModel } from "../../../services/folderService";
import type { ViewMode } from "../types";

export type MyFilesFolderSectionProps = {
  sortedFolders: FolderModel[];
  selectedFolderIds: Set<string>;
  checklistVisibilityStyle: CSSProperties;
  showEmptySearchState: boolean;
  loadingFolders: boolean;
  folderError: string;
  folderListLength: number;
  viewMode: ViewMode;
  bulkFolderDeleteLoading: boolean;
  textColor: string;
  mutedColor: string;
  borderColor: string;
  buttonSoftBg: string;
  renderListItems: () => ReactNode;
  renderGridItems: () => ReactNode;
  onToggleVisibleFolders: (checked: boolean, visibleFolderIds: string[]) => void;
  onOpenBulkFolderDeleteModal: () => void;
  onClearFolderSelection: () => void;
};

export function MyFilesFolderSection({
  sortedFolders,
  selectedFolderIds,
  checklistVisibilityStyle,
  showEmptySearchState,
  loadingFolders,
  folderError,
  folderListLength,
  viewMode,
  bulkFolderDeleteLoading,
  textColor,
  mutedColor,
  borderColor,
  buttonSoftBg,
  renderListItems,
  renderGridItems,
  onToggleVisibleFolders,
  onOpenBulkFolderDeleteModal,
  onClearFolderSelection,
}: MyFilesFolderSectionProps) {
  const visibleFolderIds = sortedFolders.map((folder) => folder.id);
  const selectedVisibleCount = visibleFolderIds.reduce(
    (acc, id) => acc + (selectedFolderIds.has(id) ? 1 : 0),
    0,
  );
  const allVisibleChecked =
    visibleFolderIds.length > 0 &&
    selectedVisibleCount === visibleFolderIds.length;
  const someVisibleChecked =
    selectedVisibleCount > 0 &&
    selectedVisibleCount < visibleFolderIds.length;

  return (
    <div className="mb-6">
      {showEmptySearchState && <EmptyFilterMessage textColor={mutedColor} />}

      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <h3
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: textColor }}
            >
              Folders
            </h3>

            {visibleFolderIds.length > 0 ? (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  aria-label="Pilih semua folder yang tampil"
                  checked={allVisibleChecked}
                  ref={(element) => {
                    if (element) element.indeterminate = someVisibleChecked;
                  }}
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) => {
                    onToggleVisibleFolders(event.target.checked, visibleFolderIds);
                  }}
                  style={{
                    width: 14,
                    height: 14,
                    accentColor: "#ef4444",
                    ...checklistVisibilityStyle,
                  }}
                />
                <div
                  className="text-xs"
                  style={{
                    color: mutedColor,
                    ...checklistVisibilityStyle,
                  }}
                >
                  Pilih semua (tampil)
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {selectedFolderIds.size > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <SelectionCountPill
              count={selectedFolderIds.size}
              label="folder dipilih"
              textColor={mutedColor}
              accentColor="#f87171"
              backgroundColor="rgba(248, 113, 113, 0.08)"
              borderColor="rgba(248, 113, 113, 0.25)"
            />

            <button
              type="button"
              onClick={onOpenBulkFolderDeleteModal}
              disabled={bulkFolderDeleteLoading}
              className="px-3 py-1 rounded-lg text-[11px] font-semibold"
              style={{
                background: "#f87171",
                border: "1px solid rgba(248,113,113,0.4)",
                color: "#080d1a",
                opacity: bulkFolderDeleteLoading ? 0.75 : 1,
              }}
              aria-label="Pindahkan folder ke Trash"
            >
              {bulkFolderDeleteLoading ? "Memproses..." : "Delete"}
            </button>

            <button
              type="button"
              onClick={() => onClearFolderSelection()}
              className="px-2 py-1 rounded-lg text-[11px] font-medium"
              style={{
                background: buttonSoftBg,
                border: `1px solid ${borderColor}`,
                color: mutedColor,
              }}
            >
              Batalkan pilihan
            </button>
          </div>
        ) : null}
      </div>

      {loadingFolders && <LoadingFoldersMessage textColor={mutedColor} />}
      {folderError && (
        <div className="text-xs" style={{ color: "#f87171" }}>
          {folderError}
        </div>
      )}
      {!loadingFolders && !folderError && folderListLength === 0 && (
        <EmptyFolderMessage textColor={mutedColor} />
      )}

      {viewMode === "list" ? (
        <div className="flex flex-col gap-2">{renderListItems()}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {renderGridItems()}
        </div>
      )}
    </div>
  );
}

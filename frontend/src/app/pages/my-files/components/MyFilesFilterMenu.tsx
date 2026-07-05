import type { RefObject } from "react";
import { Filter } from "lucide-react";
import {
  fileTypeFilterLabel,
  type FileTypeFilterValue,
} from "../myFilesFormatters";

export type MyFilesFilterMenuProps = {
  filterMenuOpen: boolean;
  selectedFilter: FileTypeFilterValue;
  accentColor: string;
  cardBg: string;
  borderColor: string;
  textColor: string;
  mutedColor: string;
  buttonSoftBg: string;
  filterMenuRef: RefObject<HTMLDivElement | null>;
  onToggleOpen: () => void;
  onSelectFilter: (value: FileTypeFilterValue) => void;
};

const FILTER_OPTIONS = [
  ["all", "All"],
  ["folders", "Folders"],
  ["images", "Images"],
  ["pdf", "PDF"],
  ["documents", "Documents"],
  ["videos", "Videos"],
  ["audio", "Audio"],
  ["archives", "Archives"],
  ["others", "Others"],
] as const;

export function MyFilesFilterMenu({
  filterMenuOpen,
  selectedFilter,
  accentColor,
  cardBg,
  borderColor,
  textColor,
  mutedColor,
  buttonSoftBg,
  filterMenuRef,
  onToggleOpen,
  onSelectFilter,
}: MyFilesFilterMenuProps) {
  return (
    <div ref={filterMenuRef} className="relative">
      <button
        type="button"
        aria-label="Filter"
        onClick={onToggleOpen}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
        style={{
          background: buttonSoftBg,
          border: `1px solid ${borderColor}`,
          color: textColor,
        }}
      >
        <Filter size={12} /> Filter: {fileTypeFilterLabel(selectedFilter)}
      </button>

      {filterMenuOpen && (
        <div
          className="absolute right-0 top-full mt-2 rounded-lg shadow-2xl"
          style={{
            zIndex: 50,
            background: cardBg,
            border: `1px solid ${borderColor}`,
            minWidth: 240,
          }}
          role="menu"
          aria-label="Filter menu"
        >
          {FILTER_OPTIONS.map(([value, label]) => {
            const isActive = selectedFilter === value;
            const activeBg = `${accentColor}12`;
            const activeBorder = `1px solid ${accentColor}55`;
            return (
              <button
                key={value}
                type="button"
                role="menuitem"
                aria-label={`Filter ${label}`}
                className="w-full flex items-center justify-between px-3 py-2 text-xs transition-colors"
                style={{
                  color: isActive ? accentColor : mutedColor,
                  background: isActive ? activeBg : "transparent",
                  border: isActive ? activeBorder : "1px solid transparent",
                  borderRadius: 8,
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget;
                  el.style.background = isActive
                    ? activeBg
                    : `${accentColor}10`;
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget;
                  el.style.background = isActive ? activeBg : "transparent";
                }}
                onClick={() => {
                  onSelectFilter(value);
                }}
              >
                <span style={{ color: isActive ? accentColor : textColor }}>
                  {label}
                </span>
                {isActive ? (
                  <span style={{ color: accentColor, fontWeight: 600 }}>
                    {"\u2713"}
                  </span>
                ) : (
                  <span style={{ color: mutedColor }}> </span>
                )}
              </button>
            );
          })}

          <div style={{ padding: "0 12px 10px" }}>
            <div className="text-[10px]" style={{ color: mutedColor }}>
              Filter diterapkan setelah Search & sebelum Sort.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

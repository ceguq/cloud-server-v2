import type { RefObject } from "react";
import { SortAsc } from "lucide-react";
import type { SortBy, SortDirection } from "../myFilesSorting";

export type MyFilesSortMenuProps = {
  sortMenuOpen: boolean;
  sortBy: SortBy;
  sortDirection: SortDirection;
  accentColor: string;
  cardBg: string;
  borderColor: string;
  textColor: string;
  mutedColor: string;
  buttonSoftBg: string;
  sortMenuRef: RefObject<HTMLDivElement | null>;
  onToggleOpen: () => void;
  onSelectSort: (sortBy: SortBy, sortDirection: SortDirection) => void;
};

const SORT_OPTIONS: Array<{
  sortBy: SortBy;
  sortDirection: SortDirection;
  label: string;
}> = [
  { sortBy: "name", sortDirection: "asc", label: "Name A-Z" },
  { sortBy: "name", sortDirection: "desc", label: "Name Z-A" },
  { sortBy: "date", sortDirection: "desc", label: "Newest first" },
  { sortBy: "date", sortDirection: "asc", label: "Oldest first" },
  { sortBy: "size", sortDirection: "asc", label: "Size smallest" },
  { sortBy: "size", sortDirection: "desc", label: "Size largest" },
  { sortBy: "type", sortDirection: "asc", label: "Type A-Z" },
];

export function MyFilesSortMenu({
  sortMenuOpen,
  sortBy,
  sortDirection,
  accentColor,
  cardBg,
  borderColor,
  textColor,
  mutedColor,
  buttonSoftBg,
  sortMenuRef,
  onToggleOpen,
  onSelectSort,
}: MyFilesSortMenuProps) {
  return (
    <div ref={sortMenuRef} className="relative">
      <button
        type="button"
        aria-label="Sort"
        onClick={onToggleOpen}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
        style={{
          background: buttonSoftBg,
          border: `1px solid ${borderColor}`,
          color: textColor,
        }}
      >
        <SortAsc size={12} /> Sort
      </button>

      {sortMenuOpen && (
        <div
          className="absolute right-0 top-full mt-2 rounded-lg shadow-2xl"
          style={{
            zIndex: 50,
            background: cardBg,
            border: `1px solid ${borderColor}`,
            minWidth: 220,
          }}
          role="menu"
          aria-label="Sort menu"
        >
          {(() => {
            const isActive = (by: SortBy, dir: SortDirection) =>
              sortBy === by && sortDirection === dir;

            const activeBg = `${accentColor}12`;
            const activeBorder = `1px solid ${accentColor}55`;

            return (
              <>
                {SORT_OPTIONS.map((option) => (
                  <button
                    key={`${option.sortBy}-${option.sortDirection}`}
                    type="button"
                    role="menuitem"
                    aria-label={option.label}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs transition-colors"
                    style={{
                      color: isActive(option.sortBy, option.sortDirection)
                        ? accentColor
                        : mutedColor,
                      background: isActive(option.sortBy, option.sortDirection)
                        ? activeBg
                        : "transparent",
                      border: isActive(option.sortBy, option.sortDirection)
                        ? activeBorder
                        : "1px solid transparent",
                      borderRadius: 8,
                    }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget;
                      el.style.background = isActive(
                        option.sortBy,
                        option.sortDirection,
                      )
                        ? activeBg
                        : `${accentColor}10`;
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget;
                      el.style.background = isActive(
                        option.sortBy,
                        option.sortDirection,
                      )
                        ? activeBg
                        : "transparent";
                    }}
                    onClick={() => {
                      onSelectSort(option.sortBy, option.sortDirection);
                    }}
                  >
                    <span>{option.label}</span>
                  </button>
                ))}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}

import type { RefObject } from "react";
import type { FileTypeFilterValue } from "../myFilesFormatters";
import type { SortBy, SortDirection } from "../myFilesSorting";
import { MyFilesFilterMenu } from "./MyFilesFilterMenu";
import { MyFilesSortMenu } from "./MyFilesSortMenu";
import { SearchHelperText } from "./SearchHelperText";
import { SearchToolbarField } from "./SearchToolbarField";

export type MyFilesToolbarProps = {
  searchQuery: string;
  isSearchActive: boolean;
  isSearchLoading: boolean;
  trimmedSearchQuery: string;
  filterMenuOpen: boolean;
  fileTypeFilter: FileTypeFilterValue;
  sortMenuOpen: boolean;
  sortBy: SortBy;
  sortDirection: SortDirection;
  accentColor: string;
  textColor: string;
  mutedColor: string;
  muted2Color: string;
  borderColor: string;
  inputBg: string;
  inputBorderColor: string;
  inputTextColor: string;
  cardBg: string;
  buttonSoftBg: string;
  filterMenuRef: RefObject<HTMLDivElement | null>;
  sortMenuRef: RefObject<HTMLDivElement | null>;
  onSearchChange: (value: string) => void;
  onSearchFocus: () => void;
  onSearchBlur: () => void;
  onSearchClear: () => void;
  onToggleFilterMenu: () => void;
  onSelectFilter: (value: FileTypeFilterValue) => void;
  onToggleSortMenu: () => void;
  onSelectSort: (sortBy: SortBy, sortDirection: SortDirection) => void;
};

export function MyFilesToolbar({
  searchQuery,
  isSearchActive,
  isSearchLoading,
  trimmedSearchQuery,
  filterMenuOpen,
  fileTypeFilter,
  sortMenuOpen,
  sortBy,
  sortDirection,
  accentColor,
  textColor,
  mutedColor,
  muted2Color,
  borderColor,
  inputBg,
  inputBorderColor,
  inputTextColor,
  cardBg,
  buttonSoftBg,
  filterMenuRef,
  sortMenuRef,
  onSearchChange,
  onSearchFocus,
  onSearchBlur,
  onSearchClear,
  onToggleFilterMenu,
  onSelectFilter,
  onToggleSortMenu,
  onSelectSort,
}: MyFilesToolbarProps) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div
        className={"flex flex-1 flex-col max-w-xs " + (isSearchActive ? "max-w-sm" : "")}
        style={{
          transition: "max-width 220ms ease",
        }}
      >
        <SearchToolbarField
          value={searchQuery}
          isSearchActive={isSearchActive}
          isSearchLoading={isSearchLoading}
          trimmedQuery={trimmedSearchQuery}
          accentColor={accentColor}
          textColor={textColor}
          mutedColor={mutedColor}
          borderColor={borderColor}
          backgroundColor={inputBg}
          inputBorderColor={inputBorderColor}
          inputTextColor={inputTextColor}
          placeholder="Search files..."
          onChange={onSearchChange}
          onFocus={onSearchFocus}
          onBlur={onSearchBlur}
          onClear={onSearchClear}
        />

        <SearchHelperText
          query={trimmedSearchQuery}
          accentColor={accentColor}
          mutedColor={mutedColor}
          secondaryMutedColor={muted2Color}
        />
      </div>

      <MyFilesFilterMenu
        filterMenuOpen={filterMenuOpen}
        selectedFilter={fileTypeFilter}
        accentColor={accentColor}
        cardBg={cardBg}
        borderColor={borderColor}
        textColor={textColor}
        mutedColor={mutedColor}
        buttonSoftBg={buttonSoftBg}
        filterMenuRef={filterMenuRef}
        onToggleOpen={onToggleFilterMenu}
        onSelectFilter={onSelectFilter}
      />
      <MyFilesSortMenu
        sortMenuOpen={sortMenuOpen}
        sortBy={sortBy}
        sortDirection={sortDirection}
        accentColor={accentColor}
        cardBg={cardBg}
        borderColor={borderColor}
        textColor={textColor}
        mutedColor={mutedColor}
        buttonSoftBg={buttonSoftBg}
        sortMenuRef={sortMenuRef}
        onToggleOpen={onToggleSortMenu}
        onSelectSort={onSelectSort}
      />
    </div>
  );
}

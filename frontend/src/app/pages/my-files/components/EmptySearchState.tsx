export type EmptySearchStateProps = {
  searchQuery: string;
  color: string;
  colSpanFull?: boolean;
};

export function EmptySearchState({
  searchQuery,
  color,
  colSpanFull = false,
}: EmptySearchStateProps) {
  return (
    <div
      className={`text-xs px-4 py-6 ${colSpanFull ? "col-span-full" : ""}`}
      style={{ color }}
    >
      Tidak ada hasil untuk "{searchQuery.trim()}"{colSpanFull ? "." : ""}
    </div>
  );
}

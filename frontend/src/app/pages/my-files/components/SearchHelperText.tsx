export type SearchHelperTextProps = {
  query: string;
  accentColor: string;
  mutedColor: string;
  secondaryMutedColor: string;
};

export function SearchHelperText({
  query,
  accentColor,
  mutedColor,
  secondaryMutedColor,
}: SearchHelperTextProps) {
  if (!query) return null;

  return (
    <div
      className="mt-2 text-[11px] leading-tight"
      style={{
        color: mutedColor,
        fontStyle: "normal",
      }}
    >
      <span style={{ color: secondaryMutedColor }}>Searching for:</span>{" "}
      <span style={{ color: accentColor }}>"{query}"</span>
    </div>
  );
}

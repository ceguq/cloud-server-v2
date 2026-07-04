export type SelectionCountPillProps = {
  count: number;
  label?: string;
  textColor: string;
  accentColor: string;
  backgroundColor?: string;
  borderColor?: string;
  className?: string;
};

export function SelectionCountPill({
  count,
  label = "folder dipilih",
  textColor,
  accentColor,
  backgroundColor = "transparent",
  borderColor = accentColor,
  className = "",
}: SelectionCountPillProps) {
  const displayLabel = count === 1 ? label.replace(/s$/u, "") : label;

  return (
    <div
      className={`text-xs font-medium ${className}`.trim()}
      style={{
        color: textColor,
        backgroundColor,
        border: `1px solid ${borderColor}`,
        borderRadius: 999,
        padding: "4px 10px",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      <span style={{ color: accentColor }}>{count}</span>
      <span>{displayLabel}</span>
    </div>
  );
}

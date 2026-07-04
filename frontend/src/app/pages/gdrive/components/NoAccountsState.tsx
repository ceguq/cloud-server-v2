export type NoAccountsStateProps = {
  title?: string;
  description?: string;
  textColor: string;
  mutedColor: string;
  backgroundColor?: string;
  borderColor?: string;
  className?: string;
};

export function NoAccountsState({
  title = "No connected accounts yet.",
  description,
  textColor,
  mutedColor,
  backgroundColor,
  borderColor,
  className = "",
}: NoAccountsStateProps) {
  return (
    <div
      className={`rounded-xl border px-3 py-5 text-xs ${className}`.trim()}
      style={{
        background: backgroundColor,
        borderColor,
        color: textColor,
      }}
    >
      <div className="font-semibold" style={{ color: textColor }}>
        {title}
      </div>
      {description ? (
        <div className="mt-1" style={{ color: mutedColor }}>
          {description}
        </div>
      ) : null}
    </div>
  );
}

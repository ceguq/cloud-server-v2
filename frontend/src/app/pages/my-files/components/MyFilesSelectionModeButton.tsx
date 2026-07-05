export type MyFilesSelectionModeButtonProps = {
  isSelectionMode: boolean;
  accentColor: string;
  buttonSoftBg: string;
  borderColor: string;
  textColor: string;
  onToggleSelectionMode: () => void;
};

export function MyFilesSelectionModeButton({
  isSelectionMode,
  accentColor,
  buttonSoftBg,
  borderColor,
  textColor,
  onToggleSelectionMode,
}: MyFilesSelectionModeButtonProps) {
  return (
    <button
      type="button"
      onClick={onToggleSelectionMode}
      className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-all"
      aria-pressed={isSelectionMode}
      aria-label={isSelectionMode ? "Exit select mode" : "Enter select mode"}
      title={isSelectionMode ? "Selection aktif" : "Enter selection mode"}
      style={{
        background: isSelectionMode
          ? `linear-gradient(135deg, ${accentColor}, #22d3ee)`
          : buttonSoftBg,
        border: isSelectionMode
          ? `1px solid ${accentColor}66`
          : `1px solid ${borderColor}`,
        color: isSelectionMode ? "#ffffff" : textColor,
        boxShadow: isSelectionMode ? `0 10px 24px ${accentColor}22` : "none",
        marginLeft: 8,
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLButtonElement;
        if (isSelectionMode) return;
        el.style.background = `${accentColor}10`;
        el.style.color = textColor;
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLButtonElement;
        if (isSelectionMode) return;
        el.style.background = buttonSoftBg;
        el.style.color = textColor;
      }}
    >
      {isSelectionMode ? "Selecting" : "Select"}
    </button>
  );
}

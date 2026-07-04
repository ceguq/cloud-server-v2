import { Grid, List } from "lucide-react";

export type ViewMode = "grid" | "list";

export type ViewModeToggleProps = {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  accentColor: string;
  textColor: string;
  mutedColor: string;
  borderColor: string;
  panelColor: string;
};

export function ViewModeToggle({
  viewMode,
  onViewModeChange,
  accentColor,
  textColor,
  mutedColor,
  borderColor,
  panelColor,
}: ViewModeToggleProps) {
  return (
    <div
      className="flex items-center rounded-lg overflow-hidden ml-auto"
      style={{
        border: `1px solid ${borderColor}`,
        background: panelColor,
      }}
    >
      {(["list", "grid"] as const).map((mode) => (
        <button
          key={mode}
          onClick={() => onViewModeChange(mode)}
          className="w-8 h-8 flex items-center justify-center transition-colors"
          style={{
            background:
              viewMode === mode
                ? `linear-gradient(135deg, ${accentColor}, #22d3ee)`
                : "transparent",
            color: viewMode === mode ? "#ffffff" : mutedColor,
            boxShadow:
              viewMode === mode ? `0 8px 18px ${accentColor}22` : "none",
          }}
          onMouseEnter={(e) => {
            if (viewMode === mode) return;
            (e.currentTarget as HTMLButtonElement).style.background =
              `${accentColor}10`;
            (e.currentTarget as HTMLButtonElement).style.color = textColor;
          }}
          onMouseLeave={(e) => {
            if (viewMode === mode) return;
            (e.currentTarget as HTMLButtonElement).style.background =
              "transparent";
            (e.currentTarget as HTMLButtonElement).style.color = mutedColor;
          }}
        >
          {mode === "list" ? <List size={14} /> : <Grid size={14} />}
        </button>
      ))}
    </div>
  );
}

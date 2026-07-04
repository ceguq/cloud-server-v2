import { Folder } from "lucide-react";

export type FilesEmptyStateProps = {
  title: string;
  description?: string;
  textColor: string;
  mutedColor: string;
  accentColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  className?: string;
};

export function FilesEmptyState({
  title,
  description,
  textColor,
  mutedColor,
  accentColor,
  backgroundColor,
  borderColor,
  className = "",
}: FilesEmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-16 ${className}`.trim()}
      style={{
        background: backgroundColor,
        borderColor,
      }}
    >
      <div
        className="flex h-12 w-12 items-center justify-center rounded-2xl"
        style={{
          background: `${accentColor ?? "#3b82f6"}12`,
          border: `1px solid ${(accentColor ?? "#3b82f6")}24`,
        }}
      >
        <Folder size={21} style={{ color: accentColor ?? "#3b82f6" }} />
      </div>
      <div className="mt-3 text-sm font-semibold" style={{ color: textColor }}>
        {title}
      </div>
      {description ? (
        <div className="mt-1 text-xs" style={{ color: mutedColor }}>
          {description}
        </div>
      ) : null}
    </div>
  );
}

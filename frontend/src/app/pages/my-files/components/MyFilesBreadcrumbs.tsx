import React from "react";
import { Home, ChevronRight } from "lucide-react";

export type BreadcrumbItem = {
  id: string;
  name: string;
};

export type MyFilesBreadcrumbsProps = {
  breadcrumbs: BreadcrumbItem[];
  accentColor: string;
  textColor: string;
  mutedColor: string;
  onBackToRoot: () => void;
  onBreadcrumbClick: (folderId: string) => void;
};

export function MyFilesBreadcrumbs({
  breadcrumbs,
  accentColor,
  textColor,
  mutedColor,
  onBackToRoot,
  onBreadcrumbClick,
}: MyFilesBreadcrumbsProps) {
  if (!breadcrumbs || breadcrumbs.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 mb-4" aria-label="Breadcrumb">
      <button
        type="button"
        onClick={onBackToRoot}
        className="flex items-center gap-1 text-xs hover:opacity-80"
        style={{ color: accentColor }}
        aria-label="Breadcrumb My Files (root)"
      >
        <Home size={12} />
        My Files
      </button>

      {breadcrumbs.map((b, idx) => {
        const isActive = idx === breadcrumbs.length - 1;
        return (
          <div key={b.id} className="flex items-center gap-1.5">
            <ChevronRight size={12} style={{ color: mutedColor }} />
            {isActive ? (
              <span className="text-xs" style={{ color: textColor }}>
                {b.name}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onBreadcrumbClick(b.id)}
                className="text-xs"
                style={{ color: textColor }}
                aria-label={`Breadcrumb ${b.name}`}
              >
                {b.name}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

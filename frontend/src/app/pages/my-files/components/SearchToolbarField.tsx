import { Search } from "lucide-react";

export type SearchToolbarFieldProps = {
  value: string;
  isSearchActive: boolean;
  isSearchLoading: boolean;
  trimmedQuery: string;
  accentColor: string;
  textColor: string;
  mutedColor: string;
  borderColor: string;
  backgroundColor: string;
  inputBorderColor: string;
  inputTextColor: string;
  placeholder?: string;
  onChange: (value: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  onClear: () => void;
};

export function SearchToolbarField({
  value,
  isSearchActive,
  isSearchLoading,
  trimmedQuery,
  accentColor,
  textColor,
  mutedColor,
  borderColor,
  backgroundColor,
  inputBorderColor,
  inputTextColor,
  placeholder = "Search files...",
  onChange,
  onFocus,
  onBlur,
  onClear,
}: SearchToolbarFieldProps) {
  return (
    <div className={"relative flex-1 max-w-xs " + (isSearchActive ? "max-w-sm" : "")}
      style={{
        transition: "max-width 220ms ease",
      }}
    >
      <Search
        size={13}
        className="absolute left-3 top-1/2 -translate-y-1/2 transition-transform"
        style={{
          color: mutedColor,
          transform:
            isSearchLoading && !isSearchActive
              ? undefined
              : isSearchActive
                ? "scale(1.08) rotate(-8deg)"
                : undefined,
          animation:
            isSearchLoading && trimmedQuery.length > 0
              ? "bb-myfiles-search-pulse 1.15s infinite ease-in-out"
              : undefined,
          transformOrigin: "center",
        }}
        aria-hidden="true"
      />

      <div className="relative" style={{ borderRadius: 10 }}>
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 10,
            pointerEvents: "none",
            opacity: isSearchActive ? 1 : 0,
            transition: "opacity 160ms ease",
            background:
              accentColor.includes("#")
                ? `${accentColor}10`
                : `${accentColor}10`,
            filter: "saturate(1.05)",
          }}
        />

        {isSearchActive && (
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              left: "12%",
              top: "50%",
              transform: "translateY(-50%)",
              width: "22%",
              height: "68%",
              pointerEvents: "none",
              borderRadius: 999,
              background:
                accentColor.includes("#")
                  ? "linear-gradient(90deg, transparent, rgba(59,130,246,0.35), transparent)"
                  : "linear-gradient(90deg, transparent, rgba(56,189,248,0.28), transparent)",
              animation: "bb-myfiles-search-shimmer 1.35s infinite ease-in-out",
              mixBlendMode: "multiply",
            }}
          />
        )}

        <input
          placeholder={placeholder}
          className="w-full pl-8 py-1.5 rounded-lg text-xs outline-none transition-[border-color,box-shadow,background]"
          onFocus={onFocus}
          onBlur={onBlur}
          style={{
            background: backgroundColor,
            border: `1px solid ${isSearchActive ? `${accentColor}77` : borderColor}`,
            color: inputTextColor,
            caretColor: accentColor,
            paddingRight: isSearchLoading ? 34 : 46,
            boxShadow:
              isSearchActive
                ? `0 0 0 3px ${accentColor}18`
                : "none",
            transition:
              "box-shadow 180ms ease, border-color 180ms ease, transform 180ms ease",
            transform: isSearchActive ? "translateY(-0.5px)" : undefined,
            animation:
              isSearchActive && !isSearchLoading
                ? "bb-myfiles-search-glow 1.8s infinite ease-in-out"
                : undefined,
          }}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />

        {isSearchLoading && trimmedQuery.length > 0 && (
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              right: 10,
              top: "50%",
              transform: "translateY(-50%)",
              display: "flex",
              gap: 4,
              alignItems: "center",
              pointerEvents: "none",
            }}
          >
            {Array.from({ length: 3 }).map((_, i) => (
              <span
                key={i}
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: 999,
                  background: accentColor,
                  opacity: 0.7,
                  animation: `bb-myfiles-search-dot 0.9s infinite ease-in-out`,
                  animationDelay: `${i * 120}ms`,
                }}
              />
            ))}
          </div>
        )}

        {!isSearchLoading && trimmedQuery.length > 0 && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={onClear}
            className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full"
            style={{
              width: 22,
              height: 22,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: mutedColor,
              background: backgroundColor,
              border: `1px solid ${borderColor}`,
              transition: "transform 160ms ease, background 160ms ease, color 160ms ease",
            }}
          >
            &times;
          </button>
        )}
      </div>
    </div>
  );
}

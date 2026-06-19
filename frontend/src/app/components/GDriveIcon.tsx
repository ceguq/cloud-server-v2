import React from "react";

export type GDriveIconProps = {
  className?: string;
  size?: number;
};

export function GDriveIcon({ className, size = 16 }: GDriveIconProps) {

  // Simple multicolor “Drive” style mark (UI-only placeholder)
  const s = size;
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M12 2L21 7V17L12 22L3 17V7L12 2Z"
        stroke="rgba(148,163,184,0.25)"
        strokeWidth="1.2"
      />
      <path
        d="M12 2L18.5 6.25L12 10.5L5.5 6.25L12 2Z"
        fill="#34A853"
      />
      <path
        d="M5.5 6.25L12 10.5V20.2L5.5 16.1V6.25Z"
        fill="#FBBC05"
      />
      <path
        d="M18.5 6.25L12 10.5V20.2L18.5 16.1V6.25Z"
        fill="#EA4335"
      />
      <path
        d="M12 10.5L18.5 16.1L12 20.2L5.5 16.1L12 10.5Z"
        fill="rgba(59,130,246,0.12)"
      />
    </svg>
  );
}


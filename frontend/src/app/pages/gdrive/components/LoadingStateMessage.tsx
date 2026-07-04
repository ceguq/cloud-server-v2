import { LoadingSpinner } from "../../../components/LoadingSpinner";

export type LoadingStateMessageProps = {
  message: string;
  textColor: string;
  spinnerColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  className?: string;
};

export function LoadingStateMessage({
  message,
  textColor,
  spinnerColor,
  backgroundColor = "transparent",
  borderColor = "transparent",
  className = "",
}: LoadingStateMessageProps) {
  return (
    <div
      className={`rounded-xl border px-3 py-4 text-xs ${className}`.trim()}
      style={{
        background: backgroundColor,
        borderColor,
        color: textColor,
      }}
    >
      <div className="flex items-center gap-2">
        <LoadingSpinner size={12} color={spinnerColor} />
        {message}
      </div>
    </div>
  );
}

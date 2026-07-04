import { LoadingSpinner } from "../../../components/LoadingSpinner";

export type LoadingFoldersMessageProps = {
  message?: string;
  textColor: string;
  spinnerColor?: string;
  className?: string;
};

export function LoadingFoldersMessage({
  message = "Loading folders...",
  textColor,
  spinnerColor,
  className = "",
}: LoadingFoldersMessageProps) {
  return (
    <div
      className={`flex items-center gap-2 text-xs ${className}`.trim()}
      style={{ color: textColor }}
    >
      <LoadingSpinner size={12} color={spinnerColor} />
      {message}
    </div>
  );
}

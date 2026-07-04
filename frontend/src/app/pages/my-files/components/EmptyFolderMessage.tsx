export type EmptyFolderMessageProps = {
  message?: string;
  textColor: string;
  className?: string;
};

export function EmptyFolderMessage({
  message = "Belum ada folder.",
  textColor,
  className = "",
}: EmptyFolderMessageProps) {
  return (
    <div className={`text-xs ${className}`.trim()} style={{ color: textColor }}>
      {message}
    </div>
  );
}

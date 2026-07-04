export type EmptyFilterMessageProps = {
  message?: string;
  textColor: string;
  className?: string;
};

export function EmptyFilterMessage({
  message = "Tidak ada item untuk filter ini.",
  textColor,
  className = "",
}: EmptyFilterMessageProps) {
  return (
    <div className={`text-xs ${className}`.trim()} style={{ color: textColor }}>
      {message}
    </div>
  );
}

type PublicShareLoadingStateProps = {
  title?: string;
  description?: string;
  className?: string;
};

export function PublicShareLoadingState({
  title = "Loading shared file...",
  description,
  className,
}: PublicShareLoadingStateProps) {
  return (
    <div
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        color: "#94a3b8",
        fontSize: 13,
      }}
    >
      <div
        style={{
          width: 16,
          height: 16,
          borderRadius: "50%",
          border: "2px solid #1a2540",
          borderTopColor: "#3b82f6",
          animation: "spin 0.8s linear infinite",
        }}
      />
      {title}
      {description ? <span>{description}</span> : null}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

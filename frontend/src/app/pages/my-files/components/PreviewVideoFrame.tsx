type Props = {
  previewUrl: string | undefined | null;
  onError: () => void;
};

export function PreviewVideoFrame({ previewUrl, onError }: Props) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#000",
        borderRadius: "0.75rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <video
        controls
        src={previewUrl ?? undefined}
        style={{
          width: "100%",
          height: "100%",
          maxHeight: "100%",
          objectFit: "contain",
          background: "#000",
        }}
        preload="metadata"
        onError={onError}
      />
    </div>
  );
}

type Props = {
  previewUrl: string | null;
  previewFileName: string;
};

export function PreviewFallbackFrame({ previewUrl, previewFileName }: Props) {
  return previewUrl ? (
    <iframe
      src={previewUrl}
      title={previewFileName}
      className="h-full w-full rounded-xl"
    />
  ) : (
    <div className="text-xs" style={{ color: "#94a3b8" }}>
      Preview tipe file ini belum tersedia di modal.
    </div>
  );
}

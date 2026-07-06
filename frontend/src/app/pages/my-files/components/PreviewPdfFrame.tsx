type Props = {
  previewUrl: string | null;
  previewFileName: string;
};

export function PreviewPdfFrame({ previewUrl, previewFileName }: Props) {
  return (
    <iframe
      src={
        previewUrl
          ? `${previewUrl}#toolbar=1&navpanes=0&scrollbar=1`
          : undefined
      }
      title={previewFileName}
      className="h-full w-full rounded-xl"
    />
  );
}

type Props = {
  previewTextError: string;
  previewIsTextTooLarge: boolean;
  previewTextLoading: boolean;
  previewText: string;
  textColor: string;
  mutedColor: string;
};

export function PreviewTextFrame({
  previewTextError,
  previewIsTextTooLarge,
  previewTextLoading,
  previewText,
  textColor,
  mutedColor,
}: Props) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {previewTextError ? (
        <div className="text-xs" style={{ color: "#f87171" }}>
          {previewTextError}
        </div>
      ) : previewIsTextTooLarge ? (
        <div className="text-xs" style={{ color: mutedColor }}>
          Preview text terlalu besar. Silakan download file untuk
          melihat isinya.
        </div>
      ) : previewTextLoading ? (
        <div className="text-xs" style={{ color: mutedColor }}>
          Loading preview text...
        </div>
      ) : (
        <pre
          style={{
            margin: 0,
            padding: 16,
            color: textColor,
            background: "transparent",
            fontFamily:
              "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace",
            fontSize: 12,
            lineHeight: 1.5,
            whiteSpace: "pre",
            overflow: "auto",
            tabSize: 2,
          }}
        >
          {previewText}
        </pre>
      )}
    </div>
  );
}

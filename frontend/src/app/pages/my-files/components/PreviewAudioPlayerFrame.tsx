import { AudioPreviewPlayer } from "./AudioPreviewPlayer";

type Props = {
  previewUrl: string | undefined | null;
  onError: () => void;
};

export function PreviewAudioPlayerFrame({ previewUrl, onError }: Props) {
  return (
    <AudioPreviewPlayer
      src={previewUrl ?? undefined}
      onError={onError}
    />
  );
}

import { clampPreviewImageScale } from "./myFilesPreviewUtils";

export type PreviewImageOffset = {
  x: number;
  y: number;
};

export function calculatePreviewImageZoomState({
  currentScale,
  currentOffset,
  nextScaleValue,
  imageRect,
  viewportRect,
  anchorPoint,
}: {
  currentScale: number;
  currentOffset: PreviewImageOffset;
  nextScaleValue: number;
  imageRect?: DOMRect | null;
  viewportRect?: DOMRect | null;
  anchorPoint?: { clientX: number; clientY: number };
}): {
  nextScale: number;
  nextOffset: PreviewImageOffset;
} {
  const nextScale = clampPreviewImageScale(nextScaleValue);

  if (nextScale === currentScale) {
    return { nextScale, nextOffset: currentOffset };
  }

  const point =
    anchorPoint ??
    (viewportRect
      ? {
          clientX: viewportRect.left + viewportRect.width / 2,
          clientY: viewportRect.top + viewportRect.height / 2,
        }
      : undefined);

  if (!imageRect || !point || imageRect.width <= 0 || imageRect.height <= 0) {
    return {
      nextScale,
      nextOffset: nextScale <= 1 ? { x: 0, y: 0 } : currentOffset,
    };
  }

  const anchorX = Math.min(
    1,
    Math.max(0, (point.clientX - imageRect.left) / imageRect.width),
  );
  const anchorY = Math.min(
    1,
    Math.max(0, (point.clientY - imageRect.top) / imageRect.height),
  );
  const scaleRatio = nextScale / currentScale;
  const nextWidth = imageRect.width * scaleRatio;
  const nextHeight = imageRect.height * scaleRatio;
  const currentCenterX = imageRect.left + imageRect.width / 2;
  const currentCenterY = imageRect.top + imageRect.height / 2;
  const nextCenterX = point.clientX - anchorX * nextWidth + nextWidth / 2;
  const nextCenterY = point.clientY - anchorY * nextHeight + nextHeight / 2;

  return {
    nextScale,
    nextOffset:
      nextScale <= 1
        ? { x: 0, y: 0 }
        : {
            x: currentOffset.x + nextCenterX - currentCenterX,
            y: currentOffset.y + nextCenterY - currentCenterY,
          },
  };
}

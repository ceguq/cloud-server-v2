import type { DetailsItem } from "../../types/myFiles";

export type DetailsModalStatePatch = {
  detailsItem: DetailsItem | null;
};

export function getOpenDetailsModalState(item: DetailsItem): DetailsModalStatePatch {
  return {
    detailsItem: item,
  };
}

export function getClosedDetailsModalState(): DetailsModalStatePatch {
  return {
    detailsItem: null,
  };
}

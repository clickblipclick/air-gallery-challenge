import type { Clip } from "./api/clips";

export type LaidOutItem = {
  id: string;
  width: number;
  height: number;
  x: number;
  asset: Clip;
};

export type Row = {
  items: LaidOutItem[];
  height: number;
  top: number;
};

const MIN_RATIO = 0.5;
const MAX_RATIO = 3;

const ratioOf = (asset: Clip): number => {
  if (!asset.width || !asset.height) return 1;
  const r = asset.width / asset.height;
  return Math.min(Math.max(r, MIN_RATIO), MAX_RATIO);
};

export function justifyRows({
  assets,
  containerWidth,
  targetRowHeight,
  gap,
}: {
  assets: Clip[];
  containerWidth: number;
  targetRowHeight: number;
  gap: number;
}): Row[] {
  if (containerWidth <= 0) return [];

  const rows: Row[] = [];
  let bucket: { asset: Clip; ratio: number }[] = [];
  let ratioSum = 0;
  let cumulativeTop = 0;

  const flush = (isLastRow: boolean) => {
    if (bucket.length === 0) return;
    const gapWidth = (bucket.length - 1) * gap;
    const idealHeight = (containerWidth - gapWidth) / ratioSum;
    const h = isLastRow ? Math.min(targetRowHeight, idealHeight) : idealHeight;

    let cursor = 0;
    const items: LaidOutItem[] = bucket.map(({ asset, ratio }) => {
      const w = ratio * h;
      const item: LaidOutItem = {
        id: asset.id,
        width: w,
        height: h,
        x: cursor,
        asset,
      };
      cursor += w + gap;
      return item;
    });

    rows.push({ items, height: h, top: cumulativeTop });
    cumulativeTop += h + gap;
    bucket = [];
    ratioSum = 0;
  };

  for (const asset of assets) {
    const ratio = ratioOf(asset);
    bucket.push({ asset, ratio });
    ratioSum += ratio;

    const gapWidth = (bucket.length - 1) * gap;
    const idealHeight = (containerWidth - gapWidth) / ratioSum;
    if (idealHeight <= targetRowHeight) flush(false);
  }
  flush(true);
  return rows;
}

"use client";

import {
  memo,
  useRef,
  useMemo,
  useState,
  useLayoutEffect,
  useEffect,
  useCallback,
} from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { justifyRows, type Row as RowType } from "./justifyRows";
import { useRegisterSelectionBoxes } from "./SelectionContext";
import { useAssets } from "./AssetsProvider";
import { useDnD, type DropIndicator } from "./DnDProvider";
import { AssetCard } from "./AssetCard";

const TARGET_ROW_HEIGHT = 240;
const GAP = 8;

const useElementWidth = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.getBoundingClientRect().width);
    const ro = new ResizeObserver((entries) => {
      setWidth(entries[0].contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return [ref, width] as const;
};

export const AssetGallery = () => {
  const parentRef = useRef<HTMLDivElement>(null);
  const [innerRef, width] = useElementWidth();
  const { assets, hasMore, isLoadingMore, loadMore } = useAssets();
  const { activeAsset, indicator } = useDnD();

  const rows = useMemo(
    () =>
      justifyRows({
        assets,
        containerWidth: width,
        targetRowHeight: TARGET_ROW_HEIGHT,
        gap: GAP,
      }),
    [assets, width],
  );

  const virtualizer = useWindowVirtualizer({
    count: rows.length,
    scrollMargin: parentRef.current?.offsetTop ?? 0,
    estimateSize: (i) => rows[i].height + GAP,
    overscan: 4,
  });

  useEffect(() => {
    virtualizer.measure();
  }, [rows, virtualizer]);

  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  const getItemBoxes = useCallback(() => {
    const parent = parentRef.current;
    if (!parent) return [];
    const rect = parent.getBoundingClientRect();
    const out: Array<{
      id: string;
      box: { left: number; top: number; width: number; height: number };
    }> = [];
    for (const row of rowsRef.current) {
      for (const item of row.items) {
        out.push({
          id: item.id,
          box: {
            left: rect.left + item.x,
            top: rect.top + row.top,
            width: item.width,
            height: item.height,
          },
        });
      }
    }
    return out;
  }, []);

  useRegisterSelectionBoxes(getItemBoxes);

  const activeId = activeAsset?.id ?? null;

  const virtualItems = virtualizer.getVirtualItems();
  const lastVisibleIndex = virtualItems[virtualItems.length - 1]?.index;

  useEffect(() => {
    if (lastVisibleIndex === undefined) return;
    if (rows.length === 0) return;
    if (!hasMore || isLoadingMore) return;
    if (lastVisibleIndex >= rows.length - 4) loadMore();
  }, [lastVisibleIndex, rows.length, hasMore, isLoadingMore, loadMore]);

  return (
    <div ref={parentRef} className="w-full">
      <div ref={innerRef}>
        <div
          style={{
            height: virtualizer.getTotalSize(),
            position: "relative",
            width: "100%",
          }}
        >
          {virtualItems.map((vRow) => {
            const row = rows[vRow.index];
            return (
              <Row
                key={vRow.index}
                row={row}
                top={vRow.start - virtualizer.options.scrollMargin}
                activeId={activeId}
                indicator={indicator}
              />
            );
          })}
        </div>
        {isLoadingMore && (
          <div className="flex items-center justify-center py-6 text-sm text-neutral-500">
            Loading more…
          </div>
        )}
      </div>
    </div>
  );
};

const Row = memo(function Row({
  row,
  top,
  activeId,
  indicator,
}: {
  row: RowType;
  top: number;
  activeId: string | null;
  indicator: DropIndicator | null;
}) {
  const indicatorItem = indicator
    ? row.items.find((it) => it.id === indicator.targetAssetId)
    : null;
  const indicatorX = indicatorItem
    ? indicator!.position === "before"
      ? indicatorItem.x - GAP / 2 - 1
      : indicatorItem.x + indicatorItem.width + GAP / 2 - 1
    : null;

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: row.height,
        transform: `translateY(${top}px)`,
      }}
    >
      <div
        style={{
          position: "relative",
          display: "flex",
          gap: GAP,
          height: "100%",
        }}
      >
        {row.items.map((item) => (
          <AssetCard
            key={item.id}
            item={item}
            isDragging={item.id === activeId}
          />
        ))}
        {indicatorX !== null && <DropLine x={indicatorX} />}
      </div>
    </div>
  );
});

const DropLine = ({ x }: { x: number }) => (
  <div
    aria-hidden
    style={{
      position: "absolute",
      top: 0,
      bottom: 0,
      left: x,
      width: 2,
      borderRadius: 1,
      background: "rgb(37, 99, 235)",
      pointerEvents: "none",
    }}
  />
);

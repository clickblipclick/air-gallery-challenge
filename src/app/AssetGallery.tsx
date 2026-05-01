"use client";

import {
  useRef,
  useMemo,
  useState,
  useLayoutEffect,
  useEffect,
  useCallback,
} from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import type { Clip } from "./api/clips";
import {
  justifyRows,
  type LaidOutItem,
  type Row as RowType,
} from "./justifyRows";
import { useSelection, useRegisterSelectionBoxes } from "./SelectionContext";
import { useDnD, type DropIndicator } from "./DnDProvider";

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
  const { assets, activeAsset, indicator, hasMore, isLoadingMore, loadMore } =
    useDnD();

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
  const { isSelected, toggle } = useSelection();

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
                isSelected={isSelected}
                onToggle={toggle}
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

const Row = ({
  row,
  top,
  activeId,
  indicator,
  isSelected,
  onToggle,
}: {
  row: RowType;
  top: number;
  activeId: string | null;
  indicator: DropIndicator | null;
  isSelected: (id: string) => boolean;
  onToggle: (id: string, event: React.MouseEvent) => void;
}) => {
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
            isSelected={isSelected(item.id)}
            onToggle={onToggle}
          />
        ))}
        {indicatorX !== null && <DropLine x={indicatorX} />}
      </div>
    </div>
  );
};

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

const AssetCard = ({
  item,
  isDragging,
  isSelected,
  onToggle,
}: {
  item: LaidOutItem;
  isDragging: boolean;
  isSelected: boolean;
  onToggle: (id: string, event: React.MouseEvent) => void;
}) => {
  const dndId = `asset:${item.id}`;
  const {
    setNodeRef: setDragRef,
    listeners,
    attributes,
  } = useDraggable({
    id: dndId,
    data: { kind: "asset", asset: item.asset },
  });
  const { setNodeRef: setDropRef } = useDroppable({
    id: dndId,
    data: { kind: "asset", assetId: item.id },
  });

  const setRefs = (node: HTMLDivElement | null) => {
    setDragRef(node);
    setDropRef(node);
  };

  const w = Math.ceil(item.width);
  const h = Math.ceil(item.height);

  const title = item.asset.title ?? item.asset.importedName ?? null;
  const meta = [
    item.asset.ext?.toUpperCase(),
    item.asset.size ? formatBytes(item.asset.size) : null,
    item.asset.width && item.asset.height
      ? `${item.asset.width} × ${item.asset.height}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      ref={setRefs}
      {...listeners}
      {...attributes}
      data-draggable="true"
      data-selected={isSelected}
      onClick={(e) => onToggle(item.id, e)}
      style={{
        width: item.width,
        height: item.height,
        opacity: isDragging ? 0.4 : 1,
        cursor: "grab",
        touchAction: "none",
      }}
      className="group/asset-card relative shrink-0 rounded-2xl ring-2 ring-inset ring-transparent transition-colors hover:bg-neutral-200 data-[selected=true]:bg-neutral-200 data-[selected=true]:ring-blue-600"
    >
      <div className="pointer-events-none absolute inset-1 overflow-hidden rounded-xl bg-neutral-200">
        <img
          src={`${item.asset.assets.image}?w=${w * 2}&h=${h * 2}&fit=crop&auto=format&q=75`}
          alt={title ?? ""}
          loading="lazy"
          draggable={false}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="pointer-events-none absolute inset-1 flex flex-col justify-end overflow-hidden rounded-xl">
        <div className="flex h-1/2 min-h-[96px] flex-col justify-end gap-0.5 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-2 opacity-0 transition-opacity group-hover/asset-card:opacity-100 group-data-[selected=true]/asset-card:opacity-100">
          {title && (
            <p
              className="truncate text-base font-medium text-white"
              style={{ textShadow: "rgba(0,0,0,0.4) 0 0 4px" }}
            >
              {title}
            </p>
          )}
          {meta && <p className="truncate text-xs text-white/90">{meta}</p>}
        </div>
      </div>
    </div>
  );
};

const formatBytes = (bytes: number) => {
  if (!bytes) return "";
  const KB = 1024;
  const MB = KB * 1024;
  if (bytes < KB) return `${bytes} B`;
  if (bytes < MB) return `${Math.round(bytes / KB)} KB`;
  return `${(bytes / MB).toFixed(0)} MB`;
};

export const AssetOverlay = ({ asset }: { asset: Clip }) => {
  const ratio = asset.width && asset.height ? asset.width / asset.height : 1;
  const h = TARGET_ROW_HEIGHT;
  const w = ratio * h;
  return (
    <div
      style={{ width: w, height: h }}
      className="overflow-hidden rounded-xl shadow-2xl ring-1 ring-black/10 cursor-grabbing"
    >
      <img
        src={`${asset.assets.image}?w=${Math.ceil(w) * 2}&h=${h * 2}&fit=crop&auto=format&q=75`}
        alt=""
        draggable={false}
        className="h-full w-full object-cover"
      />
    </div>
  );
};

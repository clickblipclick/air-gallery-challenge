"use client";

import { memo, useSyncExternalStore } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import type { LaidOutItem } from "./justifyRows";
import { useIsSelected, useSelectionActions } from "./SelectionContext";
import { ItemContextMenu } from "./ItemContextMenu";

// Round up to a coarse bucket so the CDN cache hits across small resizes.
const SIZE_BUCKET = 64;
const bucket = (n: number) => Math.ceil(n / SIZE_BUCKET) * SIZE_BUCKET;

const subscribeDpr = () => () => {};
const getDpr = () =>
  typeof window === "undefined" ? 2 : Math.min(window.devicePixelRatio || 1, 2);
const getServerDpr = () => 2;

export const AssetCard = memo(function AssetCard({
  item,
  isDragging,
}: {
  item: LaidOutItem;
  isDragging: boolean;
}) {
  const isSelected = useIsSelected(item.id);
  const { toggle } = useSelectionActions();
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

  const dpr = useSyncExternalStore(subscribeDpr, getDpr, getServerDpr);
  const w = bucket(item.width * dpr);
  const h = bucket(item.height * dpr);

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
    <ItemContextMenu id={item.id}>
      <div
        ref={setRefs}
        {...listeners}
        {...attributes}
        data-draggable="true"
        data-selected={isSelected}
        onClick={(e) => toggle(item.id, e)}
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
          {/* eslint-disable-next-line @next/next/no-img-element -- imgix already serves the exact pixel size + WebP/AVIF; routing through next/image would re-encode and add latency */}
          <img
            src={`${item.asset.assets.image}?w=${w}&h=${h}&fit=crop&auto=format&q=75`}
            alt={title ?? ""}
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
    </ItemContextMenu>
  );
});

const formatBytes = (bytes: number) => {
  if (!bytes) return "";
  const KB = 1024;
  const MB = KB * 1024;
  if (bytes < KB) return `${bytes} B`;
  if (bytes < MB) return `${Math.round(bytes / KB)} KB`;
  return `${(bytes / MB).toFixed(0)} MB`;
};

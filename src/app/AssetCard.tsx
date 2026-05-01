"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import type { LaidOutItem } from "./justifyRows";

export const AssetCard = ({
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

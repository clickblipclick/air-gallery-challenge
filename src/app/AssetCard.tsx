"use client";

import { memo, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useDndContext, useDraggable, useDroppable } from "@dnd-kit/core";
import type { LaidOutItem } from "./justifyRows";
import { useIsSelected, useSelectionActions } from "./SelectionContext";
import { ItemContextMenu, ItemMenuButton } from "./ItemContextMenu";

const HOVER_PLAYBACK_DELAY_MS = 120;

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

  const previewSrc =
    item.asset.type === "video"
      ? (item.asset.assets.previewVideo ?? item.asset.assets.video ?? null)
      : null;
  const [hovered, setHovered] = useState(false);

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
        onMouseEnter={previewSrc ? () => setHovered(true) : undefined}
        onMouseLeave={previewSrc ? () => setHovered(false) : undefined}
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
          {previewSrc && (
            <VideoHoverPreview src={previewSrc} hovered={hovered} />
          )}
          {item.asset.type === "video" && item.asset.duration ? (
            <div className="pointer-events-none absolute bottom-2 right-2 rounded bg-black/60 px-1.5 py-0.5 text-xs font-medium tabular-nums text-white opacity-100 transition-opacity group-hover/asset-card:opacity-0">
              {formatDuration(item.asset.duration)}
            </div>
          ) : null}
        </div>
        <div className="absolute right-3 top-3">
          <ItemMenuButton
            id={item.id}
            visibilityClass="group-hover/asset-card:opacity-100"
          />
        </div>
        <div className="pointer-events-none absolute inset-1 flex flex-col justify-end overflow-hidden rounded-xl">
          <div className="flex h-1/2 min-h-[96px] flex-col justify-end gap-0.5 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-2 opacity-0 transition-opacity group-hover/asset-card:opacity-100 group-data-[selected=true]/asset-card:opacity-100">
            {title && (
              <p
                className="truncate text-sm font-medium text-white"
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

function VideoHoverPreview({
  src,
  hovered,
}: {
  src: string;
  hovered: boolean;
}) {
  const { active: dndActive } = useDndContext();
  const isDragActive = dndActive != null;
  const [show, setShow] = useState(false);
  const [canPlay, setCanPlay] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!hovered || isDragActive) {
      setShow(false);
      setCanPlay(false);
      return;
    }
    timerRef.current = setTimeout(() => setShow(true), HOVER_PLAYBACK_DELAY_MS);
    return () => {
      if (timerRef.current != null) clearTimeout(timerRef.current);
    };
  }, [hovered, isDragActive]);

  if (!show) return null;
  return (
    <video
      src={src}
      muted
      loop
      playsInline
      autoPlay
      preload="metadata"
      onCanPlay={() => setCanPlay(true)}
      className="absolute inset-0 h-full w-full object-cover"
      style={{ opacity: canPlay ? 1 : 0 }}
    />
  );
}

const formatDuration = (seconds: number) => {
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
};

const formatBytes = (bytes: number) => {
  if (!bytes) return "";
  const KB = 1024;
  const MB = KB * 1024;
  if (bytes < KB) return `${bytes} B`;
  if (bytes < MB) return `${Math.round(bytes / KB)} KB`;
  return `${(bytes / MB).toFixed(0)} MB`;
};

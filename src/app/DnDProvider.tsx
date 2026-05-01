"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import type { Clip } from "./api/clips";
import { AssetOverlay } from "./AssetOverlay";
import { useAssets } from "./AssetsProvider";

export type DropIndicator = {
  targetAssetId: string;
  position: "before" | "after";
};

type ActiveData = { kind: "asset"; asset: Clip };
type OverData =
  | { kind: "asset"; assetId: string }
  | { kind: "board"; boardId: string };

type ContextValue = {
  activeAsset: Clip | null;
  indicator: DropIndicator | null;
};

const DnDContextValue = createContext<ContextValue | null>(null);

export const useDnD = () => {
  const ctx = useContext(DnDContextValue);
  if (!ctx) throw new Error("useDnD must be used inside <DnDProvider>");
  return ctx;
};

export const DnDProvider = ({ children }: { children: React.ReactNode }) => {
  const { reorderAsset, removeAsset } = useAssets();
  const [activeAsset, setActiveAsset] = useState<Clip | null>(null);
  const [indicator, setIndicator] = useState<DropIndicator | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  // Prefer direct pointer hits (so the board sidebar still wins when hovered),
  // but fall back to the nearest asset card when the pointer is in row gutters
  // or past the end of a row — otherwise dropping near row edges is finicky.
  const collisionDetection = useCallback<CollisionDetection>((args) => {
    const direct = pointerWithin(args);
    if (direct.length > 0) return direct;
    const assetContainers = args.droppableContainers.filter(
      (c) => (c.data.current as OverData | undefined)?.kind === "asset",
    );
    return closestCenter({ ...args, droppableContainers: assetContainers });
  }, []);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current as ActiveData | undefined;
    setActiveAsset(data?.kind === "asset" ? data.asset : null);
    setIndicator(null);
  }, []);

  const handleDragMove = useCallback((event: DragMoveEvent) => {
    const { over, active, activatorEvent } = event;
    const overData = over?.data.current as OverData | undefined;

    const next: DropIndicator | null = (() => {
      if (!over || !overData || over.id === active.id) return null;
      if (overData.kind === "board") return null;
      const pointerX =
        (activatorEvent as PointerEvent).clientX + (event.delta?.x ?? 0);
      const midpoint = over.rect.left + over.rect.width / 2;
      return {
        targetAssetId: overData.assetId,
        position: pointerX < midpoint ? "before" : "after",
      };
    })();

    setIndicator((prev) => {
      if (prev === next) return prev;
      if (
        prev &&
        next &&
        prev.targetAssetId === next.targetAssetId &&
        prev.position === next.position
      ) {
        return prev;
      }
      return next;
    });
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      const activeData = active.data.current as ActiveData | undefined;
      const overData = over?.data.current as OverData | undefined;

      setActiveAsset(null);
      setIndicator(null);

      if (!activeData || activeData.kind !== "asset" || !overData) return;
      const draggedId = activeData.asset.id;

      if (overData.kind === "board") {
        removeAsset(draggedId);
        return;
      }

      if (overData.assetId === draggedId) return;
      if (!indicator) return;

      reorderAsset(draggedId, indicator.targetAssetId, indicator.position);
    },
    [indicator, reorderAsset, removeAsset],
  );

  const handleDragCancel = useCallback(() => {
    setActiveAsset(null);
    setIndicator(null);
  }, []);

  const value = useMemo<ContextValue>(
    () => ({ activeAsset, indicator }),
    [activeAsset, indicator],
  );

  return (
    <DnDContextValue.Provider value={value}>
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        {children}
        <DragOverlay dropAnimation={null}>
          {activeAsset ? <AssetOverlay asset={activeAsset} /> : null}
        </DragOverlay>
      </DndContext>
    </DnDContextValue.Provider>
  );
};

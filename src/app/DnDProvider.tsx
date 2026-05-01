"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import type { Clip } from "./api/clips";
import { AssetOverlay } from "./AssetGallery";
import { loadMoreAssets } from "./actions";

export type DropIndicator = {
  targetAssetId: string;
  position: "before" | "after";
};

type ActiveData = { kind: "asset"; asset: Clip };
type OverData =
  | { kind: "asset"; assetId: string }
  | { kind: "board"; boardId: string };

type Context = {
  assets: Clip[];
  activeAsset: Clip | null;
  indicator: DropIndicator | null;
  hasMore: boolean;
  isLoadingMore: boolean;
  loadMore: () => void;
};

const DnDContextValue = createContext<Context | null>(null);

export const useDnD = () => {
  const ctx = useContext(DnDContextValue);
  if (!ctx) throw new Error("useDnD must be used inside <DnDProvider>");
  return ctx;
};

export const DnDProvider = ({
  initialAssets,
  initialCursor,
  initialHasMore,
  children,
}: {
  initialAssets: Clip[];
  initialCursor: string | null;
  initialHasMore: boolean;
  children: React.ReactNode;
}) => {
  const [assets, setAssets] = useState(initialAssets);
  const [activeAsset, setActiveAsset] = useState<Clip | null>(null);
  const [indicator, setIndicator] = useState<DropIndicator | null>(null);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadingRef = useRef(false);

  const loadMore = useCallback(() => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setIsLoadingMore(true);
    loadMoreAssets(cursor)
      .then((res) => {
        setAssets((prev) => [...prev, ...res.data.clips]);
        setCursor(res.pagination.cursor);
        setHasMore(res.pagination.hasMore);
      })
      .finally(() => {
        loadingRef.current = false;
        setIsLoadingMore(false);
      });
  }, [cursor, hasMore]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current as ActiveData | undefined;
    setActiveAsset(data?.kind === "asset" ? data.asset : null);
    setIndicator(null);
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over, active, activatorEvent } = event;
    const overData = over?.data.current as OverData | undefined;

    if (!over || !overData || over.id === active.id) {
      setIndicator(null);
      return;
    }

    if (overData.kind === "board") {
      setIndicator(null);
      return;
    }

    const pointerX =
      (activatorEvent as PointerEvent).clientX + (event.delta?.x ?? 0);
    const midpoint = over.rect.left + over.rect.width / 2;
    setIndicator({
      targetAssetId: overData.assetId,
      position: pointerX < midpoint ? "before" : "after",
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
        setAssets((prev) => prev.filter((a) => a.id !== draggedId));
        return;
      }

      if (overData.assetId === draggedId) return;
      if (!indicator) return;

      setAssets((prev) => {
        const fromIdx = prev.findIndex((a) => a.id === draggedId);
        if (fromIdx === -1) return prev;
        const without = [
          ...prev.slice(0, fromIdx),
          ...prev.slice(fromIdx + 1),
        ];
        let toIdx = without.findIndex((a) => a.id === indicator.targetAssetId);
        if (toIdx === -1) return prev;
        if (indicator.position === "after") toIdx += 1;
        return [
          ...without.slice(0, toIdx),
          prev[fromIdx],
          ...without.slice(toIdx),
        ];
      });
    },
    [indicator],
  );

  const handleDragCancel = useCallback(() => {
    setActiveAsset(null);
    setIndicator(null);
  }, []);

  const value = useMemo<Context>(
    () => ({
      assets,
      activeAsset,
      indicator,
      hasMore,
      isLoadingMore,
      loadMore,
    }),
    [assets, activeAsset, indicator, hasMore, isLoadingMore, loadMore],
  );

  return (
    <DnDContextValue.Provider value={value}>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
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

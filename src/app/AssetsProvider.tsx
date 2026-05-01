"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Clip } from "./api/clips";
import { loadMoreAssets } from "./actions";

type Position = "before" | "after";

type ContextValue = {
  assets: Clip[];
  hasMore: boolean;
  isLoadingMore: boolean;
  loadMore: () => void;
  reorderAsset: (
    draggedId: string,
    targetId: string,
    position: Position,
  ) => void;
  removeAsset: (id: string) => void;
};

const AssetsContext = createContext<ContextValue | null>(null);

export const useAssets = () => {
  const ctx = useContext(AssetsContext);
  if (!ctx) throw new Error("useAssets must be used inside <AssetsProvider>");
  return ctx;
};

export const AssetsProvider = ({
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

  const reorderAsset = useCallback(
    (draggedId: string, targetId: string, position: Position) => {
      setAssets((prev) => {
        const fromIdx = prev.findIndex((a) => a.id === draggedId);
        if (fromIdx === -1) return prev;
        const without = [
          ...prev.slice(0, fromIdx),
          ...prev.slice(fromIdx + 1),
        ];
        let toIdx = without.findIndex((a) => a.id === targetId);
        if (toIdx === -1) return prev;
        if (position === "after") toIdx += 1;
        return [
          ...without.slice(0, toIdx),
          prev[fromIdx],
          ...without.slice(toIdx),
        ];
      });
    },
    [],
  );

  const removeAsset = useCallback((id: string) => {
    setAssets((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const value = useMemo<ContextValue>(
    () => ({
      assets,
      hasMore,
      isLoadingMore,
      loadMore,
      reorderAsset,
      removeAsset,
    }),
    [assets, hasMore, isLoadingMore, loadMore, reorderAsset, removeAsset],
  );

  return (
    <AssetsContext.Provider value={value}>{children}</AssetsContext.Provider>
  );
};

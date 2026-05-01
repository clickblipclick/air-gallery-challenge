"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import {
  useSelectionContainer,
  boxesIntersect,
  type Box,
} from "react-drag-to-select";

type BoxProvider = () => Array<{ id: string; box: Box }>;

type ContextValue = {
  toggle: (id: string, event: React.MouseEvent) => void;
  selectOnly: (id: string) => void;
  clearSelection: () => void;
  registerProvider: (fn: BoxProvider) => () => void;
  subscribe: (id: string, cb: () => void) => () => void;
  subscribeAny: (cb: () => void) => () => void;
  getIsSelected: (id: string) => boolean;
  getSize: () => number;
};

const SelectionContext = createContext<ContextValue | null>(null);

const SELECTION_STYLE: React.CSSProperties = {
  border: "1px solid rgb(37, 99, 235)",
  background: "rgba(37, 99, 235, 0.15)",
  borderRadius: 2,
};

export const SelectionProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const selectedRef = useRef<Set<string>>(new Set());
  const listenersRef = useRef<Map<string, Set<() => void>>>(new Map());
  const anyListenersRef = useRef<Set<() => void>>(new Set());
  const providersRef = useRef<Set<BoxProvider>>(new Set());

  // Replace the selection set and notify listeners for any id whose
  // membership changed. No React state — consumers subscribe per-id.
  const applySelection = useCallback(
    (updater: (prev: Set<string>) => Set<string>) => {
      const prev = selectedRef.current;
      const next = updater(prev);
      if (next === prev) return;
      selectedRef.current = next;
      const listeners = listenersRef.current;
      const notify = (id: string) => {
        const set = listeners.get(id);
        if (set) set.forEach((fn) => fn());
      };
      prev.forEach((id) => {
        if (!next.has(id)) notify(id);
      });
      next.forEach((id) => {
        if (!prev.has(id)) notify(id);
      });
      anyListenersRef.current.forEach((fn) => fn());
    },
    [],
  );

  const subscribe = useCallback((id: string, cb: () => void) => {
    const listeners = listenersRef.current;
    let set = listeners.get(id);
    if (!set) {
      set = new Set();
      listeners.set(id, set);
    }
    set.add(cb);
    return () => {
      set!.delete(cb);
      if (set!.size === 0) listeners.delete(id);
    };
  }, []);

  const getIsSelected = useCallback(
    (id: string) => selectedRef.current.has(id),
    [],
  );

  const getSize = useCallback(() => selectedRef.current.size, []);

  const subscribeAny = useCallback((cb: () => void) => {
    anyListenersRef.current.add(cb);
    return () => {
      anyListenersRef.current.delete(cb);
    };
  }, []);

  const registerProvider = useCallback((fn: BoxProvider) => {
    providersRef.current.add(fn);
    return () => {
      providersRef.current.delete(fn);
    };
  }, []);

  const handleSelectionChange = useCallback(
    (selectionBox: Box) => {
      const next = new Set<string>();
      providersRef.current.forEach((fn) => {
        for (const { id, box } of fn()) {
          if (boxesIntersect(box, selectionBox)) next.add(id);
        }
      });
      applySelection((prev) => {
        if (prev.size !== next.size) return next;
        let same = true;
        next.forEach((id) => {
          if (!prev.has(id)) same = false;
        });
        return same ? prev : next;
      });
    },
    [applySelection],
  );

  const selectionProps = useMemo(() => ({ style: SELECTION_STYLE }), []);

  const { DragSelection } = useSelectionContainer({
    onSelectionChange: handleSelectionChange,
    selectionProps,
  });

  const toggle = useCallback(
    (id: string, event: React.MouseEvent) => {
      applySelection((prev) => {
        const next = new Set(prev);
        if (event.metaKey || event.ctrlKey) {
          if (next.has(id)) next.delete(id);
          else next.add(id);
        } else {
          next.clear();
          next.add(id);
        }
        return next;
      });
    },
    [applySelection],
  );

  const selectOnly = useCallback(
    (id: string) => {
      applySelection((prev) => {
        if (prev.size === 1 && prev.has(id)) return prev;
        return new Set([id]);
      });
    },
    [applySelection],
  );

  const clearSelection = useCallback(() => {
    applySelection((prev) => (prev.size === 0 ? prev : new Set()));
  }, [applySelection]);

  // Clear selection on bare-ground clicks (anywhere not on a selectable item).
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      const path = e.composedPath();
      for (const node of path) {
        if (
          node instanceof HTMLElement &&
          node.dataset.draggable === "true"
        ) {
          return;
        }
      }
      applySelection((prev) => (prev.size === 0 ? prev : new Set()));
    };
    window.addEventListener("mousedown", onMouseDown);
    return () => window.removeEventListener("mousedown", onMouseDown);
  }, [applySelection]);

  const value = useMemo<ContextValue>(
    () => ({
      toggle,
      selectOnly,
      clearSelection,
      registerProvider,
      subscribe,
      subscribeAny,
      getIsSelected,
      getSize,
    }),
    [
      toggle,
      selectOnly,
      clearSelection,
      registerProvider,
      subscribe,
      subscribeAny,
      getIsSelected,
      getSize,
    ],
  );

  return (
    <SelectionContext.Provider value={value}>
      <DragSelection />
      {children}
    </SelectionContext.Provider>
  );
};

const useSelectionContext = () => {
  const ctx = useContext(SelectionContext);
  if (!ctx) throw new Error("useSelection must be used within SelectionProvider");
  return ctx;
};

/**
 * Stable selection actions. Identity never changes, so consumers can take
 * these without re-rendering on selection updates.
 */
export const useSelectionActions = () => {
  const { toggle, selectOnly, clearSelection } = useSelectionContext();
  return { toggle, selectOnly, clearSelection };
};

/**
 * Subscribe to the total selection count. Only the calling component
 * re-renders when the count (or selected set) changes.
 */
export const useSelectionCount = () => {
  const { subscribeAny, getSize } = useSelectionContext();
  return useSyncExternalStore(subscribeAny, getSize, () => 0);
};

/**
 * Subscribe to a single asset's selection state. Only the calling
 * component re-renders when this id's membership flips.
 */
export const useIsSelected = (id: string) => {
  const { subscribe, getIsSelected } = useSelectionContext();
  const sub = useCallback((cb: () => void) => subscribe(id, cb), [subscribe, id]);
  const get = useCallback(() => getIsSelected(id), [getIsSelected, id]);
  return useSyncExternalStore(sub, get, () => false);
};

/**
 * Register a function returning the viewport-space bounding boxes for a
 * group of selectable items. The function is held in a ref so callers can
 * pass an unstable callback without re-registering.
 */
export const useRegisterSelectionBoxes = (getBoxes: BoxProvider) => {
  const { registerProvider } = useSelectionContext();
  const ref = useRef(getBoxes);
  useEffect(() => {
    ref.current = getBoxes;
  });
  useEffect(() => {
    return registerProvider(() => ref.current());
  }, [registerProvider]);
};

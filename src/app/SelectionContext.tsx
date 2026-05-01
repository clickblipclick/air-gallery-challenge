"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  useSelectionContainer,
  boxesIntersect,
  type Box,
} from "react-drag-to-select";

type BoxProvider = () => Array<{ id: string; box: Box }>;

type ContextValue = {
  isSelected: (id: string) => boolean;
  toggle: (id: string, event: React.MouseEvent) => void;
  registerProvider: (fn: BoxProvider) => () => void;
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
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const providersRef = useRef<Set<BoxProvider>>(new Set());

  const registerProvider = useCallback((fn: BoxProvider) => {
    providersRef.current.add(fn);
    return () => {
      providersRef.current.delete(fn);
    };
  }, []);

  const handleSelectionChange = useCallback((selectionBox: Box) => {
    const next = new Set<string>();
    providersRef.current.forEach((fn) => {
      for (const { id, box } of fn()) {
        if (boxesIntersect(box, selectionBox)) next.add(id);
      }
    });
    setSelected((prev) => {
      if (prev.size !== next.size) return next;
      let same = true;
      next.forEach((id) => {
        if (!prev.has(id)) same = false;
      });
      return same ? prev : next;
    });
  }, []);

  const selectionProps = useMemo(() => ({ style: SELECTION_STYLE }), []);

  const { DragSelection } = useSelectionContainer({
    onSelectionChange: handleSelectionChange,
    selectionProps,
  });

  const toggle = useCallback((id: string, event: React.MouseEvent) => {
    setSelected((prev) => {
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
  }, []);

  // Clear selection on bare-ground clicks (anywhere not on a selectable item).
  // react-drag-to-select skips elements with data-draggable="true", so a click
  // on those won't bubble through this listener via composedPath check.
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
      setSelected((prev) => (prev.size === 0 ? prev : new Set()));
    };
    window.addEventListener("mousedown", onMouseDown);
    return () => window.removeEventListener("mousedown", onMouseDown);
  }, []);

  const value = useMemo<ContextValue>(
    () => ({
      isSelected: (id) => selected.has(id),
      toggle,
      registerProvider,
    }),
    [selected, toggle, registerProvider],
  );

  return (
    <SelectionContext.Provider value={value}>
      <DragSelection />
      {children}
    </SelectionContext.Provider>
  );
};

export const useSelection = () => {
  const ctx = useContext(SelectionContext);
  if (!ctx) throw new Error("useSelection must be used within SelectionProvider");
  return ctx;
};

/**
 * Register a function returning the viewport-space bounding boxes for a
 * group of selectable items. The function is held in a ref so callers can
 * pass an unstable callback without re-registering.
 */
export const useRegisterSelectionBoxes = (getBoxes: BoxProvider) => {
  const { registerProvider } = useSelection();
  const ref = useRef(getBoxes);
  useEffect(() => {
    ref.current = getBoxes;
  });
  useEffect(() => {
    return registerProvider(() => ref.current());
  }, [registerProvider]);
};

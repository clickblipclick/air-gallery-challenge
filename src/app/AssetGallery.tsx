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
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import type { Clip } from "./api/clips";
import {
  justifyRows,
  type LaidOutItem,
  type Row as RowType,
} from "./justifyRows";
import { useSelection, useRegisterSelectionBoxes } from "./SelectionContext";

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

type DropIndicator = {
  targetId: string;
  position: "before" | "after";
};

export const AssetGallery = ({ assets: initialAssets }: { assets: Clip[] }) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const [innerRef, width] = useElementWidth();
  const [assets, setAssets] = useState(initialAssets);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [indicator, setIndicator] = useState<DropIndicator | null>(null);

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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

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

  const activeAsset = useMemo(
    () => (activeId ? (assets.find((a) => a.id === activeId) ?? null) : null),
    [activeId, assets],
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
    setIndicator(null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over, active, activatorEvent } = event;
    if (!over || over.id === active.id) {
      setIndicator(null);
      return;
    }
    const overRect = over.rect;
    const pointerX =
      (activatorEvent as PointerEvent).clientX + (event.delta?.x ?? 0);
    const midpoint = overRect.left + overRect.width / 2;
    setIndicator({
      targetId: String(over.id),
      position: pointerX < midpoint ? "before" : "after",
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || !indicator || over.id === active.id) {
      setIndicator(null);
      return;
    }
    setAssets((prev) => {
      const fromIdx = prev.findIndex((a) => a.id === active.id);
      if (fromIdx === -1) return prev;
      const without = [...prev.slice(0, fromIdx), ...prev.slice(fromIdx + 1)];
      let toIdx = without.findIndex((a) => a.id === indicator.targetId);
      if (toIdx === -1) return prev;
      if (indicator.position === "after") toIdx += 1;
      return [
        ...without.slice(0, toIdx),
        prev[fromIdx],
        ...without.slice(toIdx),
      ];
    });
    setIndicator(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setIndicator(null);
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div ref={parentRef} className="w-full">
        <div ref={innerRef}>
          <div
            style={{
              height: virtualizer.getTotalSize(),
              position: "relative",
              width: "100%",
            }}
          >
            {virtualizer.getVirtualItems().map((vRow) => {
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
        </div>
      </div>
      <DragOverlay dropAnimation={null}>
        {activeAsset ? <AssetOverlay asset={activeAsset} /> : null}
      </DragOverlay>
    </DndContext>
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
    ? row.items.find((it) => it.id === indicator.targetId)
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
  const {
    setNodeRef: setDragRef,
    listeners,
    attributes,
  } = useDraggable({
    id: item.id,
  });
  const { setNodeRef: setDropRef } = useDroppable({ id: item.id });

  const setRefs = (node: HTMLDivElement | null) => {
    setDragRef(node);
    setDropRef(node);
  };

  const w = Math.ceil(item.width);
  const h = Math.ceil(item.height);

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
      className="relative shrink-0 overflow-hidden rounded-xl bg-neutral-200 ring-2 ring-transparent ring-offset-2 data-[selected=true]:ring-blue-500"
    >
      <img
        src={`${item.asset.assets.image}?w=${w * 2}&h=${h * 2}&fit=crop&auto=format&q=75`}
        alt={item.asset.title ?? ""}
        loading="lazy"
        draggable={false}
        className="h-full w-full object-cover pointer-events-none"
      />
    </div>
  );
};

const AssetOverlay = ({ asset }: { asset: Clip }) => {
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

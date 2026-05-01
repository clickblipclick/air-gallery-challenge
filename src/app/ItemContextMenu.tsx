"use client";

import * as ContextMenu from "@radix-ui/react-context-menu";
import {
  useIsSelected,
  useSelectionActions,
  useSelectionCount,
} from "./SelectionContext";

const SelectionCountHeader = () => {
  const count = useSelectionCount();
  return (
    <ContextMenu.Label className="px-2 py-1.5 text-xs font-medium uppercase tracking-wide text-neutral-500">
      {count} item{count === 1 ? "" : "s"} selected
    </ContextMenu.Label>
  );
};

export const ItemContextMenu = ({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) => {
  const isSelected = useIsSelected(id);
  const { selectOnly } = useSelectionActions();
  const count = useSelectionCount();

  const downloadLabel = count > 1 ? "Download all" : "Download";

  return (
    <ContextMenu.Root
      onOpenChange={(open) => {
        if (open && !isSelected) selectOnly(id);
      }}
    >
      <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content
          data-draggable="true"
          collisionPadding={8}
          className="z-50 min-w-[180px] overflow-hidden rounded-md border border-neutral-200 bg-white p-1 shadow-lg outline-none"
        >
          <SelectionCountHeader />
          <ContextMenu.Separator className="my-1 h-px bg-neutral-200" />
          <ContextMenu.Item
            onSelect={() => {
              console.log("Download");
            }}
            className="cursor-default rounded px-2 py-1.5 text-sm text-neutral-700 outline-none data-[highlighted]:bg-neutral-100"
          >
            {downloadLabel}
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
};

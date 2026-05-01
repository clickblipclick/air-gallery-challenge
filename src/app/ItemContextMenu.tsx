"use client";

import * as ContextMenu from "@radix-ui/react-context-menu";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import {
  useIsSelected,
  useSelectionActions,
  useSelectionCount,
} from "./SelectionContext";

const contentClass =
  "z-50 min-w-[180px] overflow-hidden rounded-md border border-neutral-200 bg-white p-1 shadow-lg outline-none";
const itemClass =
  "cursor-default rounded px-2 py-1.5 text-sm text-neutral-700 outline-none data-[highlighted]:bg-neutral-100";
const labelClass =
  "px-2 py-1.5 text-xs font-medium uppercase tracking-wide text-neutral-500";
const separatorClass = "my-1 h-px bg-neutral-200";

const MenuItems = ({
  Label,
  Separator,
  Item,
}: {
  Label: typeof ContextMenu.Label | typeof DropdownMenu.Label;
  Separator: typeof ContextMenu.Separator | typeof DropdownMenu.Separator;
  Item: typeof ContextMenu.Item | typeof DropdownMenu.Item;
}) => {
  const count = useSelectionCount();
  const showHeader = count > 1;
  return (
    <>
      {showHeader && (
        <>
          <Label className={labelClass}>{count} items selected</Label>
          <Separator className={separatorClass} />
        </>
      )}
      <Item onSelect={() => console.log("Download")} className={itemClass}>
        {showHeader ? "Download all" : "Download"}
      </Item>
    </>
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
          // React bubbles synthetic events through the React component tree,
          // not the DOM tree — so a click inside a portaled Radix menu still
          // bubbles up through this component to the card's onClick, which
          // would collapse the selection. Stop it here.
          onClick={(e) => e.stopPropagation()}
          className={contentClass}
        >
          <MenuItems
            Label={ContextMenu.Label}
            Separator={ContextMenu.Separator}
            Item={ContextMenu.Item}
          />
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
};

export const ItemMenuButton = ({
  id,
  // Tailwind needs the literal `group-hover/<name>:` class string at build time,
  // so we pass the full visibility classes from the parent rather than a name.
  visibilityClass,
}: {
  id: string;
  visibilityClass: string;
}) => {
  const isSelected = useIsSelected(id);
  const { selectOnly } = useSelectionActions();

  return (
    <DropdownMenu.Root
      onOpenChange={(open) => {
        if (open && !isSelected) selectOnly(id);
      }}
    >
      <DropdownMenu.Trigger
        aria-label="Open menu"
        // Stop drag from starting and stop the card's onClick from toggling selection.
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className={`flex h-6 w-6 items-center justify-center rounded-md bg-black/50 text-white opacity-0 outline-none ring-1 ring-blue-600/5 transition-opacity hover:bg-black focus-visible:opacity-100 data-[state=open]:opacity-100 ${visibilityClass}`}
      >
        <MoreHorizontal className="h-4 w-4" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          data-draggable="true"
          align="end"
          sideOffset={4}
          collisionPadding={8}
          // See note on ContextMenu.Content above.
          onClick={(e) => e.stopPropagation()}
          className={contentClass}
        >
          <MenuItems
            Label={DropdownMenu.Label}
            Separator={DropdownMenu.Separator}
            Item={DropdownMenu.Item}
          />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};

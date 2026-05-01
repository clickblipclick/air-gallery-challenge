"use client";

import { useCallback, useRef } from "react";
import { useDroppable } from "@dnd-kit/core";
import type { Board } from "./api/boards";
import {
  useIsSelected,
  useRegisterSelectionBoxes,
  useSelectionActions,
} from "./SelectionContext";
import { ItemContextMenu } from "./ItemContextMenu";

export const BoardList = ({ boards }: { boards: Board[] }) => {
  const itemRefs = useRef(new Map<string, HTMLLIElement>());

  const getItemBoxes = useCallback(() => {
    const out: Array<{ id: string; box: DOMRect }> = [];
    itemRefs.current.forEach((el, id) => {
      out.push({ id, box: el.getBoundingClientRect() });
    });
    return out;
  }, []);

  useRegisterSelectionBoxes(getItemBoxes);

  return (
    <ul className="relative grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
      {boards.map((board) => (
        <BoardCard
          key={board.id}
          board={board}
          registerRef={(el) => {
            if (el) itemRefs.current.set(board.id, el);
            else itemRefs.current.delete(board.id);
          }}
        />
      ))}
    </ul>
  );
};

const BoardCard = ({
  board,
  registerRef,
}: {
  board: Board;
  registerRef: (el: HTMLLIElement | null) => void;
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `board:${board.id}`,
    data: { kind: "board", boardId: board.id },
  });
  const isSelected = useIsSelected(board.id);
  const { toggle } = useSelectionActions();

  return (
    <ItemContextMenu id={board.id}>
    <li
      ref={(el) => {
        registerRef(el);
        setNodeRef(el);
      }}
      onClick={(e) => toggle(board.id, e)}
      data-draggable="true"
      data-selected={isSelected}
      data-drop-over={isOver}
      data-has-thumbnail={Boolean(board.thumbnails?.[0])}
      className="group relative aspect-square w-full cursor-pointer rounded-xl bg-neutral-50 p-1 ring-1 ring-inset ring-neutral-300 transition-colors hover:bg-neutral-100 sm:w-48 data-[selected=true]:bg-neutral-100 data-[selected=true]:ring-2 data-[selected=true]:ring-blue-600 data-[drop-over=true]:ring-2 data-[drop-over=true]:ring-blue-600"
    >
      <div className="pointer-events-none absolute inset-1 overflow-hidden rounded-lg">
        {board.thumbnails?.[0] && (
          <>
            <img
              src={board.thumbnails[0]}
              alt={board.title}
              draggable={false}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-black/10" />
          </>
        )}
      </div>
      <div className="pointer-events-none absolute inset-x-1 bottom-1 z-10 flex flex-col items-start rounded-b-lg px-2 pt-6 pb-2 group-data-[has-thumbnail=true]:bg-gradient-to-t group-data-[has-thumbnail=true]:from-black/70 group-data-[has-thumbnail=true]:to-transparent">
        <span
          className="line-clamp-2 text-left text-lg font-semibold leading-6 text-white group-data-[has-thumbnail=false]:text-neutral-900"
          style={{ textShadow: "rgba(0,0,0,0.4) 0 0 4px" }}
        >
          {board.title}
        </span>
      </div>
    </li>
    </ItemContextMenu>
  );
};

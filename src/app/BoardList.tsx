"use client";

import { useCallback, useRef } from "react";
import type { Board } from "./api/boards";
import { useSelection, useRegisterSelectionBoxes } from "./SelectionContext";

export const BoardList = ({ boards }: { boards: Board[] }) => {
  const itemRefs = useRef(new Map<string, HTMLLIElement>());
  const { isSelected, toggle } = useSelection();

  const getItemBoxes = useCallback(() => {
    const out: Array<{ id: string; box: DOMRect }> = [];
    itemRefs.current.forEach((el, id) => {
      out.push({ id, box: el.getBoundingClientRect() });
    });
    return out;
  }, []);

  useRegisterSelectionBoxes(getItemBoxes);

  return (
    <ul className="relative flex flex-wrap gap-2">
      {boards.map((board) => (
        <li
          ref={(el) => {
            if (el) itemRefs.current.set(board.id, el);
            else itemRefs.current.delete(board.id);
          }}
          key={board.id}
          onClick={(e) => toggle(board.id, e)}
          data-draggable="true"
          data-selected={isSelected(board.id)}
          className="aspect-square w-48 h-48 relative flex p-2 border rounded-md overflow-hidden cursor-pointer ring-2 ring-transparent data-[selected=true]:ring-blue-500"
        >
          {board.thumbnails?.[0] && (
            <img
              src={board.thumbnails[0]}
              alt={board.title}
              draggable={false}
              className="object-cover absolute inset-2 pointer-events-none"
            />
          )}
          <span className="absolute inset-0 flex items-end justify-start p-4 pb-3 bg-gradient-to-t from-black/80 via-black/30 to-transparent text-white pointer-events-none">
            {board.title}
          </span>
        </li>
      ))}
    </ul>
  );
};

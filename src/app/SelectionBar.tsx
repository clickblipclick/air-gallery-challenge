"use client";

import { useTransition, animated } from "@react-spring/web";
import { Download, X } from "lucide-react";
import { useSelectionActions, useSelectionCount } from "./SelectionContext";

export const SelectionBar = () => {
  const count = useSelectionCount();
  const { clearSelection } = useSelectionActions();

  const transitions = useTransition(count > 0, {
    from: { opacity: 0, y: 24 },
    enter: { opacity: 1, y: 0 },
    leave: { opacity: 0, y: 24 },
    config: { tension: 280, friction: 26 },
  });

  return transitions((style, show) =>
    show ? (
      <div className="pointer-events-none w-full fixed bottom-6 left-0 right-0 z-50 hidden justify-center md:flex">
        <animated.div
          style={style}
          onMouseDown={(e) => e.stopPropagation()}
          className="pointer-events-auto flex grow max-w-md items-center gap-4 rounded-full bg-white/70 px-5 py-2 text-sm text-neutral-900 shadow-2xl backdrop-blur-lg backdrop-saturate-150"
        >
          <span className="font-medium flex-auto">
            <RollingNumber value={count} />
            {` ${count === 1 ? "item" : "items"} selected`}
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={clearSelection}
              aria-label="Clear selection"
              className="flex items-center gap-1.5 rounded-full bg-neutral-900/10 px-3.5 py-1.5 font-medium text-black transition-colors hover:bg-neutral-900/30"
            >
              <X size={14} />
              Clear Selection
            </button>
            <button
              type="button"
              onClick={() => console.log("download", count)}
              className="flex items-center gap-1.5 rounded-full bg-neutral-900 px-3.5 py-1.5 font-medium text-white transition-colors hover:bg-neutral-700"
            >
              <Download size={14} />
              Download
            </button>
          </div>
        </animated.div>
      </div>
    ) : null,
  );
};

const RollingNumber = ({ value }: { value: number }) => {
  const chars = value.toLocaleString().split("");
  return (
    <span className="inline-flex tabular-nums">
      {chars.map((ch, i) => (
        // Key by distance from the right so the ones place keeps its identity
        // as digits are added/removed on the left.
        <RollingChar key={chars.length - i} char={ch} />
      ))}
    </span>
  );
};

const RollingChar = ({ char }: { char: string }) => {
  const transitions = useTransition(char, {
    keys: (c) => c,
    from: { y: "100%", opacity: 0 },
    enter: { y: "0%", opacity: 1 },
    leave: { y: "-100%", opacity: 0 },
    config: { tension: 320, friction: 28 },
  });
  return (
    <span
      className="relative inline-block overflow-hidden text-center"
      style={{ width: char === "," ? "0.35ch" : "1ch" }}
    >
      {/* Invisible spacer gives the slot a real baseline matching surrounding text. */}
      <span aria-hidden className="invisible">
        0
      </span>
      {transitions((style, c) => (
        <animated.span style={style} className="absolute inset-0">
          {c}
        </animated.span>
      ))}
    </span>
  );
};

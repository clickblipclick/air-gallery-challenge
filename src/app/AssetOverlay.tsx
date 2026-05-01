"use client";

import type { Clip } from "./api/clips";

const OVERLAY_HEIGHT = 240;

export const AssetOverlay = ({ asset }: { asset: Clip }) => {
  const ratio = asset.width && asset.height ? asset.width / asset.height : 1;
  const h = OVERLAY_HEIGHT;
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

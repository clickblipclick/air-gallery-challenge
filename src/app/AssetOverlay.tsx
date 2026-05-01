"use client";

import type { Clip } from "./api/clips";

const OVERLAY_HEIGHT = 140;

export const AssetOverlay = ({ asset }: { asset: Clip }) => {
  const ratio = asset.width && asset.height ? asset.width / asset.height : 1;
  const h = OVERLAY_HEIGHT;
  const w = ratio * h;
  return (
    <div
      style={{ width: w, height: h }}
      className="overflow-hidden rounded-lg opacity-85 shadow-2xl ring-1 ring-black/10 cursor-grabbing"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- imgix already serves the exact pixel size + WebP/AVIF; routing through next/image would re-encode and add latency */}
      <img
        src={`${asset.assets.image}?w=${Math.ceil(w) * 2}&h=${h * 2}&fit=crop&auto=format&q=75`}
        alt=""
        draggable={false}
        className="h-full w-full object-cover"
      />
    </div>
  );
};

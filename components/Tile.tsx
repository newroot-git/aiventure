import * as React from "react";

// Renders a pixel tile cropped to FILL its frame (generated tiles sometimes have
// a white margin — a slight scale + object-cover crops it out).
export function Tile({
  name,
  className,
  rounded = "rounded-md",
}: {
  name: string;
  className?: string;
  rounded?: string;
}) {
  return (
    <div className={`overflow-hidden ${rounded} ${className ?? ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/img/tiles/${name}.png`}
        alt=""
        className="pixelated h-full w-full scale-[1.04] object-cover"
      />
    </div>
  );
}

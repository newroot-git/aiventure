import * as React from "react";
import { Stars } from "./atmosphere";

// Pixel-art dusk title scene. Uses the generated hero image as the backdrop
// (falls back to the aurora gradient), with a dusk scrim for text legibility.
export function PixelScene({
  className = "",
  image = "/img/hero-forest.png",
  children,
}: {
  className?: string;
  image?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={`aurora relative overflow-hidden ${className}`}>
      {image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      <Stars className="opacity-80" />
      {/* dusk scrim — darken top + bottom for white text */}
      <div className="absolute inset-0 bg-gradient-to-b from-night/70 via-night/20 to-night/85" />
      <div className="relative">{children}</div>
    </div>
  );
}

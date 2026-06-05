// Pixelarticons (MIT, github.com/halfmage/pixelarticons) — vendored monochrome
// pixel icons. Single-colour (currentColor), tint like any lucide icon.
import * as React from "react";

type IconProps = { size?: number; className?: string };

function make(path: string) {
  return function PixelIcon({ size = 24, className }: IconProps) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
        <path d={path} />
      </svg>
    );
  };
}

export const PixelHome = make("M4 20h16v2H4zm16-10h2v10h-2zM2 10h2v10H2zm2-2h2v2H4zm2-2h2v2H6zm2-2h2v2H8zm2-2h4v2h-4zm4 2h2v2h-2zm2 2h2v2h-2zm2 2h2v2h-2zM8 14h2v6H8zm2-2h4v2h-4zm4 2h2v6h-2z");
export const PixelCalendar = make("M5 4h14v2H5zm0 16h14v2H5zM3 10h2v10H3zm0-4h2v2H3zm16 0h2v2h-2zm0 4h2v10h-2zM3 8h18v2H3zm12-6h2v2h-2zM7 2h2v2H7z");
export const PixelExplore = make("M9 5h6v2H9zM7 7h2v2H7zm0 8h2v2H7zm8 0h2v2h-2zm0-8h2v2h-2zm2 2h2v6h-2zm-8 8h6v2H9zM5 9h2v6H5zm14 2h4v2h-4zM1 11h4v2H1zM11 1h2v4h-2zm0 18h2v4h-2z");
export const PixelCrew = make("M5 2h6v2H5zm10 0h4v2h-4zM5 10h6v2H5zm10 0h4v2h-4zm4-6h2v6h-2zm-8 0h2v6h-2zM3 4h2v6H3zM0 18h2v4H0zm14 0h2v4h-2zm8 0h2v4h-2zM4 14h8v2H4zm12 0h4v2h-4zM2 16h2v2H2zm10 0h2v2h-2zm8 0h2v2h-2z");
export const PixelPlus = make("M13 11h7v2h-7v7h-2v-7H4v-2h7V4h2v7Z");
export const PixelInbox = make("M2 4h2v16H2zm2 16h16v2H4zM20 4h2v16h-2zM4 2h16v2H4zm0 12h4v2H4zm4 2h8v2H8zm8-2h4v2h-4z");

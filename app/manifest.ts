import type { MetadataRoute } from "next";

// Web app manifest — makes AIventure installable to the home screen / standalone.
// Icons are PLACEHOLDERS (scripts/gen-pwa-icons.mjs) until the real brand mark exists.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AIventure — get out and do things",
    short_name: "AIventure",
    description:
      "The anti-social-media adventure app. Plan real things to do with friends, then keep the record.",
    start_url: "/plans",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#eae1cf",
    theme_color: "#eae1cf",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

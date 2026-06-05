import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Pixelify_Sans } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const pixel = Pixelify_Sans({
  variable: "--font-pixel",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "AIventure — get out and do things",
  description:
    "The anti-social-media adventure app. AIventure helps you and your friends actually go do things together — then keeps the record.",
  applicationName: "AIventure",
  appleWebApp: {
    capable: true,
    title: "AIventure",
    statusBarStyle: "default",
  },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // extend under the notch / safe areas
  themeColor: "#eae1cf", // cream app chrome
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${jakarta.variable} ${pixel.variable} antialiased`}
    >
      <body className="bg-bg text-ink font-body">
        {/* single scroll host for the whole app (see #app-scroll in globals.css) */}
        <div id="app-scroll">{children}</div>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next, Fraunces, Pixelify_Sans } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "opsz"],
  display: "swap",
});

const atkinson = Atkinson_Hyperlegible_Next({
  variable: "--font-atkinson",
  subsets: ["latin"],
  display: "swap",
});

/** Pixel font, used only by the game-world screens (boss battles, chests, shop, album). */
const pixelify = Pixelify_Sans({
  variable: "--font-pixelify",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Starlight English", template: "%s · Starlight English" },
  description: "Year 7 English practice: novels, stories, poetry, grammar and spelling — one star at a time.",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#0d1a2b",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${atkinson.variable} ${pixelify.variable} antialiased`} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}

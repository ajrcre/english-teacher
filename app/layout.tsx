import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next, Fraunces } from "next/font/google";
import type { ReactNode } from "react";
import { InstallPromptCatcher } from "@/components/InstallApp";
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

export const metadata: Metadata = {
  title: { default: "Starlight English", template: "%s · Starlight English" },
  description: "Year 7 English practice: novels, stories, poetry, grammar and spelling — one star at a time.",
  icons: { icon: "/icon.svg", apple: "/icons/apple-touch-icon.png" },
  // iOS home-screen app ("Add to Home Screen"). "black" keeps pages below the status bar.
  appleWebApp: { capable: true, title: "Starlight", statusBarStyle: "black" },
};

export const viewport: Viewport = {
  themeColor: "#0d1a2b",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${atkinson.variable} antialiased`} suppressHydrationWarning>
      <body>
        <InstallPromptCatcher />
        {children}
      </body>
    </html>
  );
}

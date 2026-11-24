import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next, Fraunces } from "next/font/google";
import type { ReactNode } from "react";
import { InstallPromptCatcher } from "@/components/InstallApp";
import { OG_IMAGE, SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, siteUrl } from "@/lib/site";
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
  metadataBase: siteUrl(),
  title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  category: "education",
  keywords: [
    "Year 7 English",
    "English Speakers' Programme",
    "Number the Stars",
    "The Giver",
    "short stories",
    "poetry",
    "grammar practice",
    "spelling test practice",
    "English homework game",
  ],
  // Link previews (WhatsApp, iMessage, Facebook, X…). Public pages refine these with publicPage().
  openGraph: { type: "website", siteName: SITE_NAME, locale: "en_GB", title: SITE_TITLE, description: SITE_DESCRIPTION, images: [OG_IMAGE] },
  twitter: { card: "summary_large_image", title: SITE_TITLE, description: SITE_DESCRIPTION, images: [OG_IMAGE] },
  // Family codes and PINs are digits: stop iOS turning them into phone-number links.
  formatDetection: { telephone: false },
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

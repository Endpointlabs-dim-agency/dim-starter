import type { Metadata } from "next";
import localFont from "next/font/local";
import { Toaster } from "@/components/ui/sonner";
import { PreviewBridge } from "@/components/preview-bridge";
import { MadeWithBadge } from "@/components/made-with-badge";
import { AssistantWidget } from "@/components/assistant-widget";
import { SiteJsonLd } from "@/components/site-json-ld";
import { siteMetadata } from "@/lib/site";
import "./globals.css";

// Self-hosted so builds and dev servers never depend on Google Fonts.
const sans = localFont({
  src: "./fonts/InterVariable.woff2",
  variable: "--font-inter",
  weight: "100 900",
});
const mono = localFont({
  src: "./fonts/JetBrainsMono.woff2",
  variable: "--font-mono",
  weight: "400",
});
const serifDisplay = localFont({
  src: "./fonts/FrauncesVariable.woff2",
  variable: "--font-fraunces",
  weight: "100 900",
});
const grotesk = localFont({
  src: "./fonts/SpaceGroteskVariable.woff2",
  variable: "--font-grotesk",
  weight: "300 700",
});

// Site name, description, Open Graph, Twitter and robots come from
// lib/site.json via siteMetadata(). Edit lib/site.json, not this line.
// Per-page titles/canonicals: export pageMetadata() from each page.
export const metadata: Metadata = siteMetadata();

// data-theme selects one of the preset themes defined in globals.css:
// engineered | editorial | warm | bold | minimal | organic
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-theme="engineered"
      className={`${sans.variable} ${mono.variable} ${serifDisplay.variable} ${grotesk.variable}`}
    >
      <body>
        <SiteJsonLd />
        {children}
        <AssistantWidget />
        <Toaster />
        <PreviewBridge />
        <MadeWithBadge />
      </body>
    </html>
  );
}

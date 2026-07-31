import type { Metadata } from "next";
import localFont from "next/font/local";
import { Toaster } from "@/components/ui/sonner";
import { PreviewBridge } from "@/components/preview-bridge";
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

export const metadata: Metadata = {
  title: "Your project is underway",
  description: "Live project workspace, powered by EndpointLabs.",
};

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
        {children}
        <Toaster />
        <PreviewBridge />
      </body>
    </html>
  );
}

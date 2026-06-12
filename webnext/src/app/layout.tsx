import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Inter, Beau_Rivage } from "next/font/google";
import Providers from "./providers";
import QueryProvider from "@/providers/QueryProvider";
import { AppChrome } from "@/shared/ui/app-chrome";

// Self-hosted, build-time-optimized fonts. next/font inlines the @font-face,
// preloads the woff2, and applies `font-display: swap` automatically — removing
// the render-blocking external request chain to fonts.googleapis.com /
// fonts.gstatic.com that the previous CSS `@import` forced onto the critical path.
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

// Brand wordmark face. Single weight (it has no variable axis), only preloaded
// where it's actually used via the `--font-beau-rivage` CSS variable (.log-font).
const beauRivage = Beau_Rivage({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-beau-rivage",
  preload: false,
});

export const metadata: Metadata = {
  title: "MatchMakers",
  description: "Find your match on MatchMakers.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#7A2432",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${beauRivage.variable}`}>
      <body className="antialiased">
        <QueryProvider>
          <Providers>
            <AppChrome>{children}</AppChrome>
          </Providers>
        </QueryProvider>
      </body>
    </html>
  );
}
import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Inter, Beau_Rivage } from "next/font/google";
import Providers from "./providers";
import QueryProvider from "@/providers/QueryProvider";
import { AppChrome } from "@/shared/ui/app-chrome";

// Self-hosted, build-time-optimized fonts.
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

// Brand wordmark face.
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

  // PWA manifest
  manifest: "/manifest.json",

  // Browser favicon + Apple Home Screen icon
  icons: {
    icon: [
      {
        url: "/icons/favicon-32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: "/icons/favicon-16.png",
        sizes: "16x16",
        type: "image/png",
      },
    ],

    apple: [
      {
        url: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },

  // Helps identify the app as a web application
  applicationName: "MatchMakers",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F87171",
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
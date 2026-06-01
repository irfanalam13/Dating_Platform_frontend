import "./globals.css";
import Providers from "./providers";
import QueryProvider from "@/providers/QueryProvider";
import { AppChrome } from "@/shared/ui/app-chrome";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
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
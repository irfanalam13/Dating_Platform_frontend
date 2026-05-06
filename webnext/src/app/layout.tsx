// import "./globals.css";
// import Providers from "./providers";

// export default function RootLayout({
//   children,
// }: {
//   children: React.ReactNode;
// }) {
//   return (
//     <html lang="en">
//       <body>
//         <Providers>
//           {children}
//         </Providers>
//       </body>
//     </html>
//   );
// }


import "./globals.css";
import Providers from "./providers";
import NavigationPage from "@/shared/ui/sidebar";
import QueryProvider from "@/providers/QueryProvider"; // Adjust the import path if needed

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {/* Wrap your application in the QueryClient provider */}
        <QueryProvider>
          <Providers>
            {/* Flex wrapper to keep the sidebar and children organized side by side */}
            <div className="flex h-screen w-full">
              {/* Sidebar Navigation */}
              <NavigationPage />
              
              {/* Main content area */}
              <main className="flex-1 overflow-y-auto p-4">
                {children}
              </main>
            </div>
          </Providers>
        </QueryProvider>
      </body>
    </html>
  );
}
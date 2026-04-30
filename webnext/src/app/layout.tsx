import "./globals.css";
import Providers from "./providers";
import AuthProvider from "@/providers/AuthProvider";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <AuthProvider>
            {children}
          </AuthProvider>
        </Providers>
      </body>
    </html>
  );
}





// import { AuthProvider } from "@/shared/lib/auth-context";

// export default function RootLayout({ children }) {
//   return (
//     <html>
//       <body>
//         <AuthProvider>
//           {children}
//         </AuthProvider>
//       </body>
//     </html>
//   );
// }
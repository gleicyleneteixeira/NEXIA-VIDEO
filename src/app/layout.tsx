"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import "./globals.css";

const PUBLIC_PATHS = ["/login", "/register"];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isPublicPage = PUBLIC_PATHS.includes(pathname);

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="h-screen w-screen overflow-hidden bg-[#0a0d14]">
        {isPublicPage ? (
          // Layout para páginas públicas (login/register)
          <>{children}</>
        ) : (
          // Layout para páginas autenticadas
          <div className="flex h-full">
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
              <Header />
              <div className="flex-1 p-6 overflow-y-auto">{children}</div>
            </main>
          </div>
        )}
      </body>
    </html>
  );
}

"use client";

import { useEffect } from "react";
import { Inter } from "next/font/google";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { useThemeStore } from "@/store";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });
const queryClient = new QueryClient();

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useThemeStore();
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);
  return <>{children}</>;
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <title>LP Tech</title>
        <meta name="description" content="Sistema de Ordens de Serviço - LP Tech" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className={`${inter.className} min-h-screen bg-background text-foreground`}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            {children}
            <Toaster
              position="top-right"
              toastOptions={{ className: "dark:bg-gray-800 dark:text-white" }}
            />
          </ThemeProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}

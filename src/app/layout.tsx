import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import { SessionProvider } from "@/components/session-provider";
import { TRPCProvider } from "@/trpc/provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Viral Payouts - Creator Marketing Platform",
  description: "Connect brands with creators for viral marketing campaigns",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <SessionProvider>
          <TRPCProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="light"
              enableSystem
              disableTransitionOnChange
            >
              {children}
              <Toaster position="top-center" richColors />
            </ThemeProvider>
          </TRPCProvider>
        </SessionProvider>
      </body>
    </html>
  );
}

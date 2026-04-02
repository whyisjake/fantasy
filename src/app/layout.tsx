import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthSessionProvider from "@/components/auth/session-provider";
import { LeagueProvider } from "@/lib/league-context";
import { ThemeProvider } from "@/lib/theme-context";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fantasy Baseball Manager",
  description: "Manage your Yahoo Fantasy Baseball team",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
      suppressHydrationWarning
    >
      <body className="flex h-full bg-surface-alt text-foreground">
        <AuthSessionProvider>
          <ThemeProvider>
            <LeagueProvider>
              <Sidebar />
              <div className="flex flex-1 flex-col overflow-hidden">
                <Header />
                <main className="flex-1 overflow-y-auto p-6">{children}</main>
              </div>
            </LeagueProvider>
          </ThemeProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}

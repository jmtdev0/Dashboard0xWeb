import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/app/components/theme-provider";
import "./globals.css";

// Version tracking - uses commit SHA in production, build timestamp as fallback
const APP_VERSION = process.env.COMMIT_REF || 
                    process.env.VERCEL_GIT_COMMIT_SHA || 
                    `build-${Date.now()}`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dashboard0x",
  description: "Personal dashboard for monitoring, tasks and schedule",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="app-version" content={APP_VERSION} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Providers } from "@/components/providers";
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Finance Tracker - Notion-Style Finance Management",
  description: "Track your finances with a beautiful Notion-style interface",
  manifest: "/manifest.json",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Finance Tracker",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script id="theme-init" strategy="beforeInteractive">
          {`(function(){
            try {
              var saved = localStorage.getItem('theme');
              var theme = saved || 'dark';
              var html = document.documentElement;
              if (theme === 'dark') {
                html.classList.add('dark');
              } else {
                html.classList.remove('dark');
              }
            } catch (e) {}
          })();`}
        </Script>
      </head>
      <body
        className={`${inter.className} antialiased`}
        style={{
          background: "var(--background)",
          color: "var(--text-primary)",
        }}
      >
        <Providers>
          {children}
          <PWAInstallPrompt />
        </Providers>
      </body>
    </html>
  );
}

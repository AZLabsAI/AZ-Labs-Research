import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from 'sonner'
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"

export const metadata: Metadata = {
  title: "Fireplexity v2 - AI-Powered Multi-Source Search",
  description: "Advanced search with AI-powered insights, news, images, and real-time information",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1">
          {children}
        </main>
        <SiteFooter />
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}

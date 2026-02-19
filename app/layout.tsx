import type { Metadata } from "next"
import "./globals.css"
import { Toaster } from "sonner"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { AuthProvider } from "./contexts/auth-context"

export const metadata: Metadata = {
  title: "AZ Labs Research - AI-Powered Multi-Source Search",
  description:
    "Advanced AI research platform with multi-source search, news, images, and real-time information",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen font-sans antialiased">
        <AuthProvider>
          <div className="flex min-h-screen flex-col">
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <SiteFooter />
          </div>
          <Toaster position="bottom-right" />
        </AuthProvider>
      </body>
    </html>
  )
}

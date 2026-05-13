import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SERVYX - Gestão de Serviços",
  description: "Sistema de gestão para prestadores de serviços",
  applicationName: "SERVYX",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SERVYX",
    startupImage: "/logo.png",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    apple: "/logo.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#121212",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        {children}
        <div id="print-portal-root" className="print-portal-root"></div>
      </body>
    </html>
  );
}

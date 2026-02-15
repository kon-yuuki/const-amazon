import type { Metadata } from "next";
import "./globals.css";

const siteName = "Const.";
const siteDescription = "定期便など周期が異なる出費を月額に換算し、家計の固定費を見える化するアプリ。";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Const.",
  description: siteDescription,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icons/pwa-icon-192.png",
    apple: "/icons/pwa-icon-192.png",
  },
  openGraph: {
    type: "website",
    url: "/",
    title: siteName,
    siteName,
    description: siteDescription,
    images: [
      {
        url: "/ogp.png",
        width: 1200,
        height: 600,
        alt: "Const. ogp",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: siteName,
    description: siteDescription,
    images: ["/ogp.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}

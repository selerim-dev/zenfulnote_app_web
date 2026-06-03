import type { Metadata } from "next";
import localFont from "next/font/local";
import { siteConfig } from "@/config/site";
import "./globals.css";

const ppNeue = localFont({
  variable: "--font-pp-neue",
  display: "swap",
  src: [
    {
      path: "./fonts/ppneuemontreal-book.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/ppneuemontreal-medium.otf",
      weight: "500",
      style: "normal",
    },
    {
      path: "./fonts/ppneuemontreal-bold.otf",
      weight: "700",
      style: "normal",
    },
    {
      path: "./fonts/ppneuemontreal-italic.otf",
      weight: "400",
      style: "italic",
    },
  ],
});

const lora = localFont({
  variable: "--font-lora",
  display: "swap",
  src: [
    {
      path: "./fonts/lora-regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/lora-semibold.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "./fonts/lora-italic.ttf",
      weight: "400",
      style: "italic",
    },
  ],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} | Official shadow work journaling app`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: siteConfig.name,
    images: [
      {
        url: "/images/brand/app-icon.png",
        width: 1024,
        height: 1024,
        alt: "ZenfulNote app icon",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary",
    title: siteConfig.name,
    description: siteConfig.description,
    images: ["/images/brand/app-icon.png"],
  },
  icons: {
    icon: "/icon.png",
    apple: "/images/brand/app-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${ppNeue.variable} ${lora.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}

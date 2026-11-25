import type { Metadata } from "next";
import PwaRegistrar from "./pwa-registrar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Demo Seller — Thoughtful pieces for softer living",
  description:
    "Discover considered pieces for a calmer, more comfortable home.",
  applicationName: "Demo Seller Marketplace",
  manifest: "/manifest.json",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#faf9f7" />
      </head>
      <body>
        <PwaRegistrar />
        {children}
      </body>
    </html>
  );
}

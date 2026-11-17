import type { Metadata } from "next";
import "./globals.css";

const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
const siteOrigin = process.env.SITE_URL || (productionHost ? `https://${productionHost}` : "http://127.0.0.1:5173");

export const metadata: Metadata = {
  title: "Pharma Cosmos — G‘amxo‘rlik. Sizga yaqin.",
  description: "Pharma Cosmos dorixonalar tarmog‘i. Dorilar, vitaminlar va biologik faol qo‘shimchalar. Yaqin filialni toping va fikringizni qoldiring.",
  metadataBase: new URL(siteOrigin),
  openGraph: { title: "Pharma Cosmos — G‘amxo‘rlik. Sizga yaqin.", description: "140+ dorixona. Bitta g‘amxo‘rlik.", locale: "uz_UZ", type: "website" },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uz">
      <body>{children}</body>
    </html>
  );
}

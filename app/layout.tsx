import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pharma Cosmos — G‘amxo‘rlik. Sizga yaqin.",
  description: "Pharma Cosmos dorixonalar tarmog‘i. Dorilar, vitaminlar va biologik faol qo‘shimchalar. Yaqin filialni toping va fikringizni qoldiring.",
  metadataBase: new URL("https://pharma-cosmos-orbit.gulomjavohir1999.chatgpt.site"),
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

import type { Metadata } from "next";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

/* DM Sans — clean product sans-serif (all weights for heading hierarchy) */
const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

/* JetBrains Mono — precision numbers & stats */
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Nardy Blitz — Backgammon, redesigned",
  description:
    "Fast matches. Beautiful board. AI coaching after every game.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${jetbrains.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}

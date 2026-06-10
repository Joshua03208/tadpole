import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Fraunces } from "next/font/google";
import "./globals.css";

// Display face for headings only (see globals.css) — warm editorial serif that
// gives the cream/lowercase brand its personality. Self-hosted via next/font:
// no external requests, no layout shift. Body text stays the system sans.
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://tadpole.app"),
  title: {
    default: "tadpole",
    template: "%s · tadpole",
  },
  description:
    "Tadpole connects dads for friendship, peer support, and local meet-ups. Platonic — not a dating app.",
  applicationName: "tadpole",
  // Lets Twitter use the inherited file-based opengraph-image as a large card.
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-GB" className={fraunces.variable}>
      <body className="min-h-screen bg-bg text-ink antialiased">{children}</body>
    </html>
  );
}

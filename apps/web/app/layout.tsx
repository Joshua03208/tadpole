import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

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
    <html lang="en-GB">
      <body className="min-h-screen bg-bg text-ink antialiased">{children}</body>
    </html>
  );
}

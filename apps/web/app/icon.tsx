import { ImageResponse } from "next/og";

// Favicon / app icon. Generated at build time from the brand wordmark glyph —
// a lowercase ink "t" with the accent dot on cream. No binary asset, no extra
// dependency. Mirrors opengraph-image.tsx.
export const runtime = "nodejs";
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#F2EFE8",
          fontSize: 44,
          fontWeight: 700,
          letterSpacing: "-0.05em",
          color: "#000000",
        }}
      >
        t<span style={{ color: "#3E7C5A" }}>.</span>
      </div>
    ),
    { ...size },
  );
}

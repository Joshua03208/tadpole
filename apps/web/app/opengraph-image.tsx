import { ImageResponse } from "next/og";

// Branded default social card, inherited by every route that doesn't set its
// own openGraph.images (i.e. all of them today — seeded activity covers are
// null). Generated at build time; no binary asset, no extra dependency.
export const runtime = "nodejs";
export const alt = "tadpole — friendship, peer support and local meet-ups for dads";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          backgroundColor: "#F2EFE8",
          padding: "90px",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 150,
            fontWeight: 700,
            color: "#000000",
            letterSpacing: "-0.05em",
          }}
        >
          tadpole<span style={{ color: "#3E7C5A" }}>.</span>
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 28,
            fontSize: 46,
            lineHeight: 1.25,
            color: "rgba(0,0,0,0.7)",
            maxWidth: 940,
          }}
        >
          friendship, peer support &amp; local meet-ups for dads
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 18,
            fontSize: 30,
            fontWeight: 600,
            color: "#3E7C5A",
          }}
        >
          platonic, never dating
        </div>
      </div>
    ),
    { ...size },
  );
}

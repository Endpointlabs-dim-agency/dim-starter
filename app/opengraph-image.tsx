import { ImageResponse } from "next/og";
import { SITE } from "@/lib/site";

// Default link-preview image (1200x630) for every page that doesn't ship its
// own. Built from the site name + description so shared links never show a
// blank card. Replace with a designed image or a real photo when the owner
// supplies one (keep this file name).
export const alt = SITE.name;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: "72px 80px",
          background: "#0f1215",
          color: "#f3f4f6",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ width: 72, height: 8, background: "#4f8cff", borderRadius: 4, marginBottom: 36 }} />
        <div style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.05, letterSpacing: -1.5 }}>{SITE.name}</div>
        <div style={{ fontSize: 32, marginTop: 24, color: "#aab1bb", lineHeight: 1.3, maxWidth: 980 }}>
          {SITE.description}
        </div>
      </div>
    ),
    size,
  );
}

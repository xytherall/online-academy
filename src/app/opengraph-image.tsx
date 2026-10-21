import { ImageResponse } from "next/og";
import { crestDataUrl } from "@/lib/brand-crest";
import { getSiteSettings } from "@/lib/get-site-settings";
import { stripEmphasis } from "@/lib/parse-emphasis";
import { FALLBACK_SITE_LABEL } from "@/lib/settings";

export const alt = "Academy";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  // Falls back to neutral placeholder content rather than ever failing to
  // render an image — a broken OG image is worse than a generic one.
  const settings = await getSiteSettings().catch(() => null);
  const academyName = settings?.academy_name?.trim() || FALLBACK_SITE_LABEL;
  const headline = stripEmphasis(settings?.tagline ?? "").trim() || "Online O Level / A Level academy";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #12243F 0%, #1F437A 100%)",
        }}
      >
        <img
          src={crestDataUrl({ shield: "#ffffff", letters: "#12243F", book: "#86aee9" })}
          width={150}
          height={150}
          alt=""
          style={{ marginBottom: 32 }}
        />
        <div
          style={{
            display: "flex",
            fontSize: 76,
            fontWeight: 600,
            color: "#ffffff",
            textAlign: "center",
            letterSpacing: "-0.02em",
            maxWidth: 1000,
          }}
        >
          {academyName}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 28,
            fontSize: 32,
            color: "rgba(255,255,255,0.78)",
            textAlign: "center",
            maxWidth: 880,
          }}
        >
          {headline}
        </div>
      </div>
    ),
    { ...size },
  );
}

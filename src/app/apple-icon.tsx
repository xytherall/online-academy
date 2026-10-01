import { ImageResponse } from "next/og";
import { getSiteSettings } from "@/lib/get-site-settings";
import { FALLBACK_SITE_LABEL } from "@/lib/settings";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  const settings = await getSiteSettings().catch(() => null);
  const academyName = settings?.academy_name?.trim() || FALLBACK_SITE_LABEL;
  const letter = academyName.charAt(0).toUpperCase();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#12243F",
          borderRadius: 40,
          color: "#ffffff",
          fontSize: 100,
          fontWeight: 600,
        }}
      >
        {letter}
      </div>
    ),
    { ...size },
  );
}

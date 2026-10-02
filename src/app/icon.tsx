import { ImageResponse } from "next/og";
import { getSiteSettings } from "@/lib/get-site-settings";
import { FALLBACK_SITE_LABEL } from "@/lib/settings";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default async function Icon() {
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
          borderRadius: 7,
          color: "#ffffff",
          fontSize: 20,
          fontWeight: 600,
        }}
      >
        {letter}
      </div>
    ),
    { ...size },
  );
}

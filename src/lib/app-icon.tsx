import { ImageResponse } from "next/og";
import { getSiteSettings } from "@/lib/get-site-settings";
import { FALLBACK_SITE_LABEL } from "@/lib/settings";

/**
 * The navy used for the browser icon, the installed app's icon, its splash
 * screen and the phone's status bar. Image generation (next/og) and the web
 * manifest can't read CSS variables, so it lives here as a single constant;
 * it matches the student dashboard band (--dashboard-band-from).
 */
export const APP_NAVY = "#12243F";

/** Background of the installed app's launch splash screen (--background, light). */
export const APP_SPLASH_BACKGROUND = "#ffffff";

/**
 * A navy square with the academy's first letter: the favicon, the Apple
 * touch icon and the installed-app icons all use it.
 *
 * `maskable` icons get cropped by Android to a circle or squircle, so the
 * letter has to fit inside the central 80% "safe zone" and the background
 * must fill the whole square with no rounded corners.
 */
export async function renderAppIcon({
  size,
  maskable = false,
  rounded = true,
}: {
  size: number;
  maskable?: boolean;
  rounded?: boolean;
}): Promise<ImageResponse> {
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
          background: APP_NAVY,
          borderRadius: maskable || !rounded ? 0 : Math.round(size * 0.22),
          color: "#ffffff",
          fontSize: Math.round(size * (maskable ? 0.45 : 0.56)),
          fontWeight: 600,
        }}
      >
        {letter}
      </div>
    ),
    { width: size, height: size },
  );
}

import { ImageResponse } from "next/og";
import { crestDataUrl } from "@/lib/brand-crest";

/**
 * The navy used for the browser icon, the installed app's icon, its splash
 * screen and the phone's status bar. Image generation (next/og) and the web
 * manifest can't read CSS variables, so it lives here as a single constant;
 * it matches the student dashboard band (--dashboard-band-from).
 */
export const APP_NAVY = "#12243F";

/** Background of the installed app's launch splash screen (--background, light). */
export const APP_SPLASH_BACKGROUND = "#ffffff";

/** The crest on navy: white shield, navy letters, light-blue book. */
const CREST_ON_NAVY = crestDataUrl({ shield: "#ffffff", letters: APP_NAVY, book: "#86aee9" });

/**
 * A navy square with the white LIS crest: the favicon, the Apple touch icon
 * and the installed-app icons all use it.
 *
 * `maskable` icons get cropped by Android to a circle or squircle, so the
 * crest has to fit inside the central 80% "safe zone" and the background
 * must fill the whole square with no rounded corners.
 */
export function renderAppIcon({
  size,
  maskable = false,
  rounded = true,
}: {
  size: number;
  maskable?: boolean;
  rounded?: boolean;
}): ImageResponse {
  const crestSize = Math.round(size * (maskable ? 0.58 : 0.74));

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
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- next/og renders plain <img>, not next/image */}
        <img src={CREST_ON_NAVY} width={crestSize} height={crestSize} alt="" />
      </div>
    ),
    { width: size, height: size },
  );
}

import { renderAppIcon } from "@/lib/app-icon";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// iOS rounds the corners of home-screen icons itself, so this one is a full square.
export default function AppleIcon() {
  return renderAppIcon({ size: size.width, rounded: false });
}

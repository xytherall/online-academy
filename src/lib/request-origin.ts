import "server-only";
import { headers } from "next/headers";

/**
 * The origin the current request was served from, e.g. "https://academy.example"
 * or "http://localhost:3000".
 *
 * Used to build the login URL in the "Copy login message" panel after accepting
 * an application, so the message is correct on Netlify without a hardcoded
 * domain or a rebuild — there is no domain yet (SPEC §2) and no
 * NEXT_PUBLIC_SITE_URL in this project.
 *
 * `host` is ultimately client-supplied, so this must never be used for a
 * redirect, an email, or any trust decision. Its only use is text shown back to
 * the signed-in admin who made the request, who would notice a wrong domain.
 */
export async function getRequestOrigin(): Promise<string> {
  const headerList = await headers();

  // Netlify (and every other proxy in front of Next) sets x-forwarded-*; the
  // plain Host header is what `next dev` / `next start` see directly.
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  if (!host) {
    throw new Error("Could not determine the request host.");
  }

  const forwardedProto = headerList.get("x-forwarded-proto");
  // x-forwarded-proto can be a comma-separated chain; the first entry is the
  // scheme the client actually used.
  const proto = forwardedProto?.split(",")[0]?.trim() || inferProto(host);

  return `${proto}://${host}`;
}

function inferProto(host: string): string {
  const hostname = host.split(":")[0];
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
  return isLocal ? "http" : "https";
}

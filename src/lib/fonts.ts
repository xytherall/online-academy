import { Figtree, Fraunces } from "next/font/google";

// Display/heading font — optical-size axis enabled so Fraunces renders with
// its display-weight shapes at large sizes and text-weight shapes when small.
// `weight: "variable"` is required for the `opsz` axis to load; headings are
// pinned to weight 400 in globals.css.
export const fraunces = Fraunces({
  subsets: ["latin"],
  axes: ["opsz"],
  weight: "variable",
  variable: "--font-fraunces",
  display: "swap",
});

export const figtree = Figtree({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-figtree",
  display: "swap",
});

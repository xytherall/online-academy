import { DM_Sans, DM_Serif_Display } from "next/font/google";

// Display/heading font. DM Serif Display ships a single weight (400), which
// is what headings are pinned to in globals.css; italic is used for the
// emphasised words in the home hero.
export const dmSerifDisplay = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-dm-serif-display",
  display: "swap",
});

export const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-dm-sans",
  display: "swap",
});

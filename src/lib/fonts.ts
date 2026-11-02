import { DM_Sans, Source_Serif_4 } from "next/font/google";

// Display/heading font. Source Serif 4 is a variable font, so every weight is
// available; headings are pinned to 600 in globals.css, and italic is used
// for the emphasised words in the home hero.
export const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-source-serif",
  display: "swap",
});

export const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-dm-sans",
  display: "swap",
});

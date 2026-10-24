import { Big_Shoulders, IBM_Plex_Mono } from "next/font/google";

// Public pages only: a tall signage face for headings (echoes the poster lettering) and a mono for seat numbers and times.
export const poster = Big_Shoulders({ subsets: ["latin"], weight: ["700", "800", "900"], variable: "--nf-poster" });
export const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--nf-mono" });

export const publicFontVars = `${poster.variable} ${plexMono.variable}`;

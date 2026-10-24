import { Big_Shoulders, IBM_Plex_Mono } from "next/font/google";

// A tall signage face for public-site headings (echoes the poster lettering) and a mono for seat numbers and times.
// Next.js has no fallback metrics for Big Shoulders, so skip its automatic fallback sizing (the build fails otherwise).
export const poster = Big_Shoulders({ subsets: ["latin"], weight: ["700", "800", "900"], variable: "--nf-poster", adjustFontFallback: false });
export const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--nf-mono" });

export const publicFontVars = `${poster.variable} ${plexMono.variable}`;

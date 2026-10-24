import type { Metadata } from "next";
import { Hind, Oswald } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import "./globals.css";

const hind = Hind({ subsets: ["latin", "devanagari"], weight: ["400", "500", "600", "700"], variable: "--font-hind" });
const oswald = Oswald({ subsets: ["latin"], weight: ["500", "700"], variable: "--font-oswald" });

export const metadata: Metadata = {
  title: "SSRA Library — Study For Success With Right Ambition",
  description: "SSRA Library, Bhrigun Chauraha (Barwa-Kasia Road), Kushinagar. Fully AC self-study library for boys & girls.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale}>
      <body className={`${hind.variable} ${oswald.variable} font-sans antialiased`}>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}

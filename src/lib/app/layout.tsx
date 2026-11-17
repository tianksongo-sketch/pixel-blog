import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import type { CSSProperties } from "react";
import "./globals.css";
import { isSeed, randomSeed, schemeVars, themeCss, type Mode } from "@/lib/theme";
import { Providers } from "@/components/Providers";
import { Footer } from "@/components/Footer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Pixel Blog", template: "%s · Pixel Blog" },
  description: "Blog pribadi dengan gaya Material You ala Google Pixel.",
  icons: { icon: "/favicon.svg" }
};

export async function generateViewport(): Promise<Viewport> {
  const c = await cookies();
  const raw = c.get("px_theme")?.value;
  const seed = isSeed(raw) ? raw.toUpperCase() : randomSeed();
  const v = schemeVars(seed);
  return {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    themeColor: [
      { media: "(prefers-color-scheme: light)", color: v.light.surface },
      { media: "(prefers-color-scheme: dark)", color: v.dark.surface }
    ]
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const c = await cookies();
  const rawSeed = c.get("px_theme")?.value;
  const seed = isSeed(rawSeed) ? rawSeed.toUpperCase() : randomSeed();
  const rawMode = c.get("px_mode")?.value;
  const mode: Mode = rawMode === "light" || rawMode === "dark" ? rawMode : "auto";
  const consent = c.get("px_consent")?.value ?? null;
  const name = c.get("px_name")?.value ?? null;
  const hasVid = !!c.get("px_vid")?.value;
  const { light } = schemeVars(seed);
  const style = Object.fromEntries(Object.entries(light).map(([k, v]) => [`--md-${k}`, v])) as CSSProperties;

  return (
    <html lang="id" data-mode={mode} style={style}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Google+Sans+Flex:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block" rel="stylesheet" />
        <style id="px-theme" dangerouslySetInnerHTML={{ __html: themeCss(seed) }} />
      </head>
      <body>
        <Providers initial={{ seed, mode, consent, name, hasVid }}>
          {children}
          <Footer />
        </Providers>
      </body>
    </html>
  );
}

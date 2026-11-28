import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import type { CSSProperties } from "react";
import "./globals.css";
import "./alive.css";
import "./soft.css";
import "./glass.css";
import { schemeVars, themeCss, type Mode } from "@/lib/theme";
import { siteUrl } from "@/lib/utils";
import { defaultOgImage, SITE_DESC } from "@/lib/seo";
import { Providers } from "@/components/Providers";
import { Footer } from "@/components/Footer";
import { BottomNav } from "@/components/BottomNav";
import { PageShell } from "@/components/PageShell";
import { Alive } from "@/components/Alive";
import { CommandPalette } from "@/components/CommandPalette";
import { SeaBackground } from "@/components/SeaBackground";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const base = siteUrl();
  const og = await defaultOgImage();
  return {
    metadataBase: new URL(base),
    title: { default: "F4KUYY", template: "%s | F4KUYY" },
    description: SITE_DESC,
    icons: { icon: "/favicon.svg" },
    alternates: { canonical: `${base}/`, types: { "application/rss+xml": `${base}/feed.xml` } },
    openGraph: {
      siteName: "F4KUYY", locale: "id_ID", type: "website", url: `${base}/`,
      title: "F4KUYY", description: SITE_DESC,
      images: og ? [{ url: og, width: 1200, height: 900, alt: "F4KUYY" }] : undefined
    },
    twitter: { card: "summary_large_image", title: "F4KUYY", description: SITE_DESC, images: og ? [og] : undefined },
    robots: { index: true, follow: true }
  };
}

export async function generateViewport(): Promise<Viewport> {
  const c = await cookies();
  const raw = c.get("px_mode")?.value;
  const dark = raw !== "light";
  return {
    width: "device-width", initialScale: 1, viewportFit: "cover",
    themeColor: [
      { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
      { media: "(prefers-color-scheme: dark)", color: "#000000" }
    ],
    colorScheme: dark ? "dark light" : "light dark"
  };
}

const ICONS_SCRIPT = `(function(){
  var d=document;
  function on(){d.documentElement.classList.add('icons-on')}
  if(d.fonts&&d.fonts.ready&&typeof d.fonts.ready.then==='function'){d.fonts.ready.then(on)}
  setTimeout(on,1500);
})();`;

const A11Y_CSS = `
html:not(.icons-on) .ms{visibility:hidden}
:root{--g-dim:rgba(255,255,255,.66);--g-dim-2:rgba(255,255,255,.55)}
:root[data-mode="light"]{--g-dim:rgba(0,0,0,.66);--g-dim-2:rgba(0,0,0,.55)}
@media (prefers-color-scheme: light){
  :root:not([data-mode="dark"]){--g-dim:rgba(0,0,0,.66);--g-dim-2:rgba(0,0,0,.55)}
}
`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const c = await cookies();
  const rawMode = c.get("px_mode")?.value;
  const mode: Mode = rawMode === "light" || rawMode === "dark" ? rawMode : "auto";
  const consent = c.get("px_consent")?.value ?? null;
  const name = c.get("px_name")?.value ?? null;
  const hasVid = !!c.get("px_vid")?.value;

  let lebay = false, reduce = false;
  const rawMotion = c.get("px_motion")?.value;
  if (rawMotion) {
    try {
      const m = JSON.parse(decodeURIComponent(rawMotion)) as { lebay?: boolean; reduce?: boolean };
      lebay = !!m.lebay; reduce = !!m.reduce;
    } catch { /* abaikan */ }
  }

  const { light } = schemeVars();
  const style = {
    ...Object.fromEntries(Object.entries(light).map(([k, v]) => [`--md-${k}`, v])),
    "--mo": reduce ? "0" : lebay ? "2" : "1"
  } as CSSProperties;

  const base = siteUrl();
  const siteLd = {
    "@context": "https://schema.org", "@type": "WebSite",
    name: "F4KUYY", url: base, inLanguage: "id-ID",
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${base}/?q={search_term_string}` },
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <html lang="id" data-mode={mode} data-lebay={lebay && !reduce ? "on" : "off"} data-motion={reduce ? "reduce" : "full"} style={style}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Anton&family=Inter+Tight:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block" rel="stylesheet" />
        <link rel="alternate" type="application/rss+xml" title="F4KUYY" href="/feed.xml" />
        <style id="px-theme" dangerouslySetInnerHTML={{ __html: themeCss() }} />
        <style id="px-a11y" dangerouslySetInnerHTML={{ __html: A11Y_CSS }} />
        <script dangerouslySetInnerHTML={{ __html: ICONS_SCRIPT }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(siteLd) }} />
      </head>
      <body>
        <SeaBackground />
        <Providers initial={{ seed: "mono", mode, consent, name, hasVid }}>
          <PageShell>{children}</PageShell>
          <Footer />
          <BottomNav />
          <Alive />
          <CommandPalette />
        </Providers>
      </body>
    </html>
  );
}

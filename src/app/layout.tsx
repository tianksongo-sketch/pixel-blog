import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import type { CSSProperties } from "react";
import "./globals.css";
import "./flow.css";
import { themeCss, type Mode } from "@/lib/theme";
import { siteUrl } from "@/lib/utils";
import { defaultOgImage, SITE_DESC } from "@/lib/seo";
import { DEFAULT_FLOW, flowVars, normalizeFlow } from "@/lib/flow";
import { Providers } from "@/components/Providers";
import { PageShell } from "@/components/PageShell";
import { OSShell } from "@/components/os/OSShell";

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
  const dark = c.get("px_mode")?.value !== "light";
  return {
    width: "device-width", initialScale: 1, viewportFit: "cover",
    themeColor: [
      { media: "(prefers-color-scheme: light)", color: "#F3EFFA" },
      { media: "(prefers-color-scheme: dark)", color: "#120A2A" }
    ],
    colorScheme: dark ? "dark light" : "light dark"
  };
}

const ICONS_SCRIPT = `(function(){var d=document;function on(){d.documentElement.classList.add('icons-on')}
if(d.fonts&&d.fonts.ready&&typeof d.fonts.ready.then==='function'){d.fonts.ready.then(on)}setTimeout(on,1500);})();`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const c = await cookies();
  const rawMode = c.get("px_mode")?.value;
  const mode: Mode = rawMode === "light" || rawMode === "dark" ? rawMode : "auto";
  const consent = c.get("px_consent")?.value ?? null;
  const name = c.get("px_name")?.value ?? null;
  const hasVid = !!c.get("px_vid")?.value;

  let flow = DEFAULT_FLOW;
  const rawFlow = c.get("px_flow")?.value;
  if (rawFlow) { try { flow = normalizeFlow(JSON.parse(decodeURIComponent(rawFlow))); } catch {} }

  const style = {
    ...flowVars(flow),
    "--mo": flow.reduce ? "0" : "1"
  } as CSSProperties;

  const base = siteUrl();
  const ld = {
    "@context": "https://schema.org", "@type": "WebSite",
    name: "F4KUYY", url: base, inLanguage: "id-ID",
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${base}/tulisan?q={search_term_string}` },
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <html lang="id" data-mode={mode} data-wall={flow.wallpaper} data-clock={flow.clock}
      data-motion={flow.reduce ? "reduce" : "full"} style={style}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@200;300;400;500;600;700;800&family=Barlow+Condensed:wght@200;300;400&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block" rel="stylesheet" />
        <link rel="alternate" type="application/rss+xml" title="F4KUYY" href="/feed.xml" />
        <style id="px-theme" dangerouslySetInnerHTML={{ __html: themeCss() }} />
        <script dangerouslySetInnerHTML={{ __html: ICONS_SCRIPT }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      </head>
      <body>
        <Providers initial={{ seed: "mono", mode, consent, name, hasVid }}>
          <OSShell />
          <PageShell>{children}</PageShell>
        </Providers>
      </body>
    </html>
  );
}

import { listCards, getFull } from "@/lib/db";
import { siteUrl } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

const cdata = (s: string) => `<![CDATA[${s.replace(/]]>/g, "]]&gt;")}]]>`;

export async function GET() {
  const base = siteUrl();
  const cards = (await listCards(false).catch(() => [])).slice(0, 30);
  const full = await Promise.all(cards.map((c) => getFull(c.id).catch(() => null)));

  const items = cards.map((c, i) => {
    const url = `${base}/post/${c.id}`;
    const body = full[i]?.body || "";
    const img = c.hasCover ? `${base}/api/img/${c.id}?v=${c.ver}` : "";
    return `    <item>
      <title>${esc(c.title)}</title>
      <link>${esc(url)}</link>
      <guid isPermaLink="true">${esc(url)}</guid>
      <pubDate>${new Date(c.createdAt).toUTCString()}</pubDate>
      <dc:creator>${esc(c.author)}</dc:creator>
      <description>${esc(c.excerpt)}</description>
      ${c.labels.map((l) => `<category>${esc(l)}</category>`).join("\n      ")}
      ${img ? `<enclosure url="${esc(img)}" type="image/webp" length="0" />` : ""}
      <content:encoded>${cdata(body)}</content:encoded>
    </item>`;
  }).join("\n");

  const last = cards[0] ? new Date(cards[0].createdAt).toUTCString() : new Date().toUTCString();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>F4KUYY</title>
    <link>${esc(base)}</link>
    <atom:link href="${esc(base)}/feed.xml" rel="self" type="application/rss+xml" />
    <description>Catatan, cerita, dan hal-hal yang layak dibagikan.</description>
    <language>id</language>
    <lastBuildDate>${last}</lastBuildDate>
    <generator>F4KUYY · Material 3 Expressive</generator>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=1800, stale-while-revalidate=86400"
    }
  });
}

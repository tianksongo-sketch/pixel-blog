import type { MetadataRoute } from "next";
import { listCards } from "@/lib/db";
import { siteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const posts = await listCards(false).catch(() => []);
  const now = new Date();

  const statics: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.5 }
  ];

  const entries: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${base}/post/${p.id}`,
    lastModified: new Date(p.updatedAt || p.createdAt || now),
    changeFrequency: "weekly",
    priority: 0.8,
    images: p.hasCover ? [`${base}/api/img/${p.id}?v=${p.ver}`] : undefined
  }));

  return [...statics, ...entries];
}

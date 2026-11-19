import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getArticle, getFull, getNeighbors } from "@/lib/db";
import { getViews } from "@/lib/views";
import { isAuthed } from "@/lib/auth";
import { siteUrl } from "@/lib/utils";
import { TopAppBar } from "@/components/TopAppBar";
import { PostDetail } from "@/components/PostDetail";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const p = await getFull(id);
  if (!p || p.deletedAt) return { title: "Tidak ditemukan" };
  const base = siteUrl();
  const url = `${base}/post/${id}`;
  const img = p.hasCover ? `${base}/api/img/${id}?v=${p.ver}` : null;
  return {
    title: p.title,
    description: p.excerpt || `${p.title} — F4KUYY.`,
    alternates: { canonical: url },
    keywords: p.labels,
    openGraph: {
      title: p.title, description: p.excerpt, url, type: "article",
      publishedTime: new Date(p.createdAt).toISOString(),
      modifiedTime: new Date(p.updatedAt).toISOString(),
      authors: [p.author], tags: p.labels,
      images: img ? [{ url: img, width: 1200, height: 900 }] : undefined
    },
    twitter: { card: img ? "summary_large_image" : "summary", title: p.title, description: p.excerpt, images: img ? [img] : undefined }
  };
}

export default async function PostPage({ params }: Params) {
  const { id } = await params;
  const c = await cookies();
  const vid = c.get("px_vid")?.value;
  const data = await getArticle(id, vid);
  if (!data) notFound();
  if (data.post.status === "draft" && !(await isAuthed())) notFound();
  const [{ newer, older }, views] = await Promise.all([getNeighbors(id), getViews(id)]);

  const base = siteUrl();
  const url = `${base}/post/${id}`;
  const img = data.post.hasCover ? `${base}/api/img/${id}?v=${data.post.ver}` : undefined;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        "@id": url,
        headline: data.post.title,
        description: data.post.excerpt,
        datePublished: new Date(data.post.createdAt).toISOString(),
        dateModified: new Date(data.post.updatedAt).toISOString(),
        inLanguage: "id-ID",
        keywords: data.post.labels.join(", "),
        wordCount: data.post.body.replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length,
        image: img ? [img] : undefined,
        author: { "@type": "Person", name: data.post.author },
        publisher: { "@type": "Organization", name: "F4KUYY", url: base },
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
        interactionStatistic: [
          { "@type": "InteractionCounter", interactionType: "https://schema.org/LikeAction", userInteractionCount: data.stats.likes },
          { "@type": "InteractionCounter", interactionType: "https://schema.org/CommentAction", userInteractionCount: data.stats.comments }
        ]
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Beranda", item: base },
          { "@type": "ListItem", position: 2, name: data.post.title, item: url }
        ]
      }
    ]
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <TopAppBar title="Postingan" back />
      <PostDetail post={data.post} stats={data.stats} comments={data.comments} newer={newer} older={older} views={views} />
    </>
  );
}

import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getArticle, getFull, getNeighbors } from "@/lib/db";
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
    openGraph: {
      title: p.title, description: p.excerpt, url, type: "article",
      publishedTime: new Date(p.createdAt).toISOString(),
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
  const { newer, older } = await getNeighbors(id);
  return (
    <>
      <TopAppBar title="Postingan" back />
      <PostDetail post={data.post} stats={data.stats} comments={data.comments} newer={newer} older={older} />
    </>
  );
}

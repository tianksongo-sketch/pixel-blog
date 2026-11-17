import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { commentCount, getComments, getPost, isLiked, likeCount } from "@/lib/db";
import { siteUrl } from "@/lib/utils";
import { TopAppBar } from "@/components/TopAppBar";
import { PostDetail } from "@/components/PostDetail";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const p = await getPost(id);
  if (!p) return { title: "Tidak ditemukan" };
  const base = siteUrl();
  const url = `${base}/post/${id}`;
  const img = `${base}/api/img/${id}?v=${p.ver}`;
  return {
    title: p.title,
    description: `${p.title} — baca di Pixel Blog.`,
    alternates: { canonical: url },
    openGraph: {
      title: p.title, description: "Pixel Blog", url, type: "article",
      images: [{ url: img, width: 1200, height: 900 }]
    },
    twitter: { card: "summary_large_image", title: p.title, images: [img] }
  };
}

export default async function PostPage({ params }: Params) {
  const { id } = await params;
  const p = await getPost(id);
  if (!p) notFound();
  const vid = (await cookies()).get("px_vid")?.value;
  const [likes, comments, liked, cms] = await Promise.all([
    likeCount(id),
    commentCount(id),
    vid ? isLiked(id, vid) : Promise.resolve(false),
    getComments(id)
  ]);
  return (
    <>
      <TopAppBar title="Postingan" back />
      <PostDetail post={{ ...p, likes, comments, liked }} comments={cms} />
    </>
  );
}

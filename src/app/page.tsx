import { cookies } from "next/headers";
import { getFeed } from "@/lib/db";
import { getViews } from "@/lib/views";
import { Glance, TopAppBar } from "@/components/TopAppBar";
import { FeedView } from "@/components/FeedView";
import { HeroStats } from "@/components/HeroStats";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ label?: string }> }) {
  const sp = await searchParams;
  const vid = (await cookies()).get("px_vid")?.value;
  const posts = await getFeed(vid);

  /* Statistik dihitung di server supaya angkanya selalu benar saat render. */
  const views = await Promise.all(posts.map((p) => getViews(p.id).catch(() => 0)));
  const stats = {
    posts: posts.length,
    likes: posts.reduce((a, p) => a + p.likes, 0),
    comments: posts.reduce((a, p) => a + p.comments, 0),
    views: views.reduce((a, b) => a + b, 0),
    labels: new Set(posts.flatMap((p) => p.labels)).size
  };

  const initialLabel = typeof sp.label === "string" ? sp.label.slice(0, 24) : undefined;

  return (
    <>
      <TopAppBar title="F4KUYY" large />
      <main className="container page">
        <Glance />
        <HeroStats stats={stats} />
        <FeedView posts={posts} initialLabel={initialLabel} />
      </main>
    </>
  );
}

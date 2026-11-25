import { cookies } from "next/headers";
import { getFeed } from "@/lib/db";
import { Glance, TopAppBar } from "@/components/TopAppBar";
import { FeedView } from "@/components/FeedView";
import { HeroStats } from "@/components/HeroStats";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ label?: string }> }) {
  const sp = await searchParams;
  const vid = (await cookies()).get("px_vid")?.value;
  const posts = await getFeed(vid);
  const initialLabel = typeof sp.label === "string" ? sp.label.slice(0, 24) : undefined;
  return (
    <>
      <TopAppBar title="F4KUYY" large />
      <main className="container page">
        <Glance />
        <HeroStats />
        <FeedView posts={posts} initialLabel={initialLabel} />
      </main>
    </>
  );
}

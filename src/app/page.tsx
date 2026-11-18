import { cookies } from "next/headers";
import { getFeed } from "@/lib/db";
import { Glance, TopAppBar } from "@/components/TopAppBar";
import { FeedView } from "@/components/FeedView";

export const dynamic = "force-dynamic";

export default async function Home() {
  const vid = (await cookies()).get("px_vid")?.value;
  const posts = await getFeed(vid);
  return (
    <>
      <TopAppBar title="F4KUYY" large />
      <main className="container page">
        <Glance />
        <FeedView posts={posts} />
      </main>
    </>
  );
}

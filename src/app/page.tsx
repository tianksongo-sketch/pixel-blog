import { cookies } from "next/headers";
import { getFeed } from "@/lib/db";
import { Glance, TopAppBar } from "@/components/TopAppBar";
import { PostCard } from "@/components/PostCard";
import { Icon } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Home() {
  const vid = (await cookies()).get("px_vid")?.value;
  const posts = await getFeed(vid);
  return (
    <>
      <TopAppBar title="Pixel Blog" large />
      <main className="container page">
        <Glance />
        {posts.length > 0 ? (
          <div className="feed-grid">
            {posts.map((p, i) => <PostCard key={p.id} post={p} index={i} />)}
          </div>
        ) : (
          <div className="empty">
            <Icon name="photo_library" size={56} />
            <p style={{ marginTop: 12 }}>Belum ada postingan. Buka halaman admin untuk mulai menulis.</p>
          </div>
        )}
      </main>
    </>
  );
}

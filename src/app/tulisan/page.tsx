import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getFeed } from "@/lib/db";
import { FeedView } from "@/components/FeedView";
import { AppFrame } from "@/components/os/AppFrame";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tulisan",
  description: "Semua catatan, cerita, dan tugas yang tersimpan di F4KUYY."
};

export default async function TulisanPage({ searchParams }: { searchParams: Promise<{ label?: string }> }) {
  const sp = await searchParams;
  const vid = (await cookies()).get("px_vid")?.value;
  const posts = await getFeed(vid);
  const initialLabel = typeof sp.label === "string" ? sp.label.slice(0, 24) : undefined;

  return (
    <AppFrame title="Tulisan" icon="article" gradient="linear-gradient(145deg,#7A3CFF,#E8437F)">
      <main className="container page">
        <FeedView posts={posts} initialLabel={initialLabel} />
      </main>
    </AppFrame>
  );
}

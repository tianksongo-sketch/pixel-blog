import { NextResponse } from "next/server";
import { adminList, getImg, trashList } from "@/lib/db";
import { isAuthed } from "@/lib/auth";
import { getViewsMany } from "@/lib/views";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAuthed())) return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });

  try {
    const [posts, trash] = await Promise.all([adminList(), trashList()]);
    const all = [...posts, ...trash];
    const active = posts.filter((post) => !post.deletedAt);
    const views = await getViewsMany(active.map((post) => post.id));
    const images = all.filter((post) => post.hasCover);

    const postBytes = Buffer.byteLength(JSON.stringify(all.map(({ commentsList: _comments, ...post }) => post)), "utf8");
    let imageBytes = 0;
    for (let i = 0; i < images.length; i += 20) {
      const batch = await Promise.all(images.slice(i, i + 20).map((post) => getImg(post.id)));
      imageBytes += batch.reduce((sum, image) => sum + (image ? Buffer.byteLength(image, "utf8") : 0), 0);
    }

    const top = active
      .filter((post) => post.status === "published")
      .map((post) => ({ id: post.id, title: post.title, views: views[post.id] ?? 0, likes: post.likes, comments: post.comments }))
      .sort((a, b) => b.views - a.views || b.likes - a.likes || b.comments - a.comments)
      .slice(0, 5);

    const counts = {
      total: all.length,
      published: active.filter((post) => post.status === "published").length,
      drafts: active.filter((post) => post.status === "draft").length,
      trashed: trash.length,
      comments: active.reduce((sum, post) => sum + post.comments, 0),
      likes: active.reduce((sum, post) => sum + post.likes, 0),
      views: Object.values(views).reduce((sum, count) => sum + count, 0),
      images: images.length
    };
    const bytes = { posts: postBytes, images: imageBytes, total: postBytes + imageBytes };

    return NextResponse.json({ counts, bytes, top });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Gagal membaca statistik." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { redis, listCards, commentCount, likeCount } from "@/lib/db";
import { getViews } from "@/lib/views";
import { isAuthed } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function scanKeys(pattern: string): Promise<string[]> {
  if (!redis) return [];
  const out: string[] = [];
  try {
    let cursor = "0";
    for (let i = 0; i < 40; i++) {
      const r = (await redis.scan(cursor, { match: pattern, count: 200 })) as [string, string[]];
      (r?.[1] ?? []).forEach((k) => out.push(String(k)));
      const next = String(r?.[0] ?? "0");
      if (!next || next === "0") break;
      cursor = next;
    }
  } catch { /* abaikan */ }
  return [...new Set(out)];
}

async function totalBytes(keys: string[]): Promise<number> {
  if (!redis || !keys.length) return 0;
  let sum = 0;
  for (const k of keys) {
    try { sum += Number(await redis.strlen(k)) || 0; } catch { /* abaikan */ }
  }
  return sum;
}

export async function GET() {
  if (!(await isAuthed())) return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });

  const cards = await listCards(true).catch(() => []);
  const active = cards.filter((c) => !c.deletedAt);
  const trashed = cards.filter((c) => c.deletedAt);

  const [comments, likes, views] = await Promise.all([
    Promise.all(active.map((c) => commentCount(c.id))),
    Promise.all(active.map((c) => likeCount(c.id))),
    Promise.all(active.map((c) => getViews(c.id)))
  ]);

  const postKeys = await scanKeys("px:post:*");
  const imgKeys = await scanKeys("img:*");
  const [postBytes, imgBytes] = await Promise.all([totalBytes(postKeys), totalBytes(imgKeys)]);

  const top = active
    .map((c, i) => ({
      id: c.id, title: c.title, views: views[i] || 0,
      likes: likes[i] || 0, comments: comments[i] || 0,
      score: (views[i] || 0) + (likes[i] || 0) * 6 + (comments[i] || 0) * 10
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return NextResponse.json({
    counts: {
      total: cards.length,
      published: active.filter((c) => c.status === "published").length,
      drafts: active.filter((c) => c.status === "draft").length,
      trashed: trashed.length,
      comments: comments.reduce((a, b) => a + b, 0),
      likes: likes.reduce((a, b) => a + b, 0),
      views: views.reduce((a, b) => a + b, 0),
      images: imgKeys.length
    },
    bytes: { posts: postBytes, images: imgBytes, total: postBytes + imgBytes },
    top
  });
}

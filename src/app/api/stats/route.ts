import { NextResponse } from "next/server";
import { listCards, likeCount, commentCount } from "@/lib/db";
import { getViews } from "@/lib/views";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const cards = await listCards(false).catch(() => []);
  const [likes, comments, views] = await Promise.all([
    Promise.all(cards.map((c) => likeCount(c.id).catch(() => 0))),
    Promise.all(cards.map((c) => commentCount(c.id).catch(() => 0))),
    Promise.all(cards.map((c) => getViews(c.id).catch(() => 0)))
  ]);
  const labels = new Set<string>();
  cards.forEach((c) => c.labels.forEach((l) => labels.add(l)));
  return NextResponse.json({
    posts: cards.length,
    likes: likes.reduce((a, b) => a + b, 0),
    comments: comments.reduce((a, b) => a + b, 0),
    views: views.reduce((a, b) => a + b, 0),
    labels: labels.size,
    latest: cards[0] ? cards[0].createdAt : 0
  });
}

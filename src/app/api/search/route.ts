import { NextRequest, NextResponse } from "next/server";
import { getFull, listCards } from "@/lib/db";
import { htmlToText } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const query = (req.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase().slice(0, 80);
  if (query.length < 2) return NextResponse.json({ items: [] });

  const cards = await listCards(false);
  const candidates = cards.slice(0, 250);
  const full = await Promise.all(candidates.map((card) => getFull(card.id)));
  const items = candidates.filter((card, i) => {
    const post = full[i];
    const searchable = `${card.title} ${card.excerpt} ${card.labels.join(" ")} ${post ? htmlToText(post.body) : ""}`;
    return searchable.toLowerCase().includes(query);
  }).slice(0, 12);

  return NextResponse.json({ items: items.map(({ id, title, excerpt, labels, createdAt, readMin, hasCover, thumb, ver }) => ({
    id, title, excerpt, labels, createdAt, readMin, hasCover, thumb, ver
  })) });
}

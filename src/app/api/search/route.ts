import { NextRequest, NextResponse } from "next/server";
import { listCards } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = (new URL(req.url).searchParams.get("q") || "").trim().toLowerCase();
  const cards = await listCards(false).catch(() => []);
  const rows = cards.map((c) => ({
    id: c.id, title: c.title, excerpt: c.excerpt, labels: c.labels,
    createdAt: c.createdAt, readMin: c.readMin, hasCover: c.hasCover, thumb: c.thumb
  }));
  const out = !q ? rows.slice(0, 12) : rows.filter((r) =>
    (r.title + " " + r.excerpt + " " + r.labels.join(" ")).toLowerCase().includes(q)
  ).slice(0, 20);
  return NextResponse.json({ items: out, total: rows.length });
}

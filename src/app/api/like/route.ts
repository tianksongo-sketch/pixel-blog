import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getPost, toggleLike } from "@/lib/db";
import { hit, ipOf } from "@/lib/rate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const vid = (await cookies()).get("px_vid")?.value;
  if (!vid) return NextResponse.json({ needConsent: true }, { status: 401 });
  if (!(await hit(`rl:like:${ipOf(req)}`, 30, 60))) {
    return NextResponse.json({ error: "Terlalu cepat, coba lagi sebentar lagi." }, { status: 429 });
  }
  const b = await req.json().catch(() => ({}));
  const id = String(b.id ?? "");
  const post = await getPost(id);
  if (!post) return NextResponse.json({ error: "Postingan tidak ditemukan" }, { status: 404 });
  const r = await toggleLike(id, vid);
  return NextResponse.json(r);
}

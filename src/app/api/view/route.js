import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHash } from "crypto";
import { getPost } from "@/lib/db";
import { addView } from "@/lib/views";
import { ipOf } from "@/lib/rate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}));
  const id = String(b.id ?? "");
  if (!id) return NextResponse.json({ error: "Parameter id wajib" }, { status: 400 });
  const post = await getPost(id);
  if (!post) return NextResponse.json({ error: "Postingan tidak ditemukan" }, { status: 404 });

  const vid = (await cookies()).get("px_vid")?.value;
  const who = vid || "ip:" + createHash("sha256").update(ipOf(req)).digest("hex").slice(0, 16);
  const views = await addView(id, who);
  return NextResponse.json({ ok: true, views });
}

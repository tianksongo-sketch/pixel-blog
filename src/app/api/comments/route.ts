import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { addComment, getComments, getPost } from "@/lib/db";
import { hit, ipOf } from "@/lib/rate";
import { escapeHtml } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("post") || "";
  if (!id) return NextResponse.json({ error: "Parameter post wajib" }, { status: 400 });
  return NextResponse.json({ comments: await getComments(id) });
}

export async function POST(req: NextRequest) {
  const c = await cookies();
  const vid = c.get("px_vid")?.value;
  if (!vid) return NextResponse.json({ needConsent: true }, { status: 401 });
  const name = c.get("px_name")?.value;
  if (!name) return NextResponse.json({ needName: true }, { status: 400 });
  if (!(await hit(`rl:cm:${ipOf(req)}`, 5, 60))) {
    return NextResponse.json({ error: "Terlalu cepat, tunggu sebentar ya." }, { status: 429 });
  }
  const b = await req.json().catch(() => ({}));
  const postId = String(b.post ?? "");
  const raw = String(b.text ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
  if (!raw || raw.length > 500) {
    return NextResponse.json({ error: "Komentar 1–500 karakter." }, { status: 400 });
  }
  const post = await getPost(postId);
  if (!post) return NextResponse.json({ error: "Postingan tidak ditemukan" }, { status: 404 });
  const comment = await addComment(postId, { name, text: escapeHtml(raw), vid });
  return NextResponse.json({ ok: true, comment });
}

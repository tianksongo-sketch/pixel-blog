import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { addComment, getPost } from "@/lib/db";
import { listFor, ownerOf, removeComment } from "@/lib/comments";
import { isAuthed } from "@/lib/auth";
import { hit, ipOf } from "@/lib/rate";
import { escapeHtml } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("post") || "";
  if (!id) return NextResponse.json({ error: "Parameter post wajib" }, { status: 400 });
  const vid = (await cookies()).get("px_vid")?.value;
  const [comments, canModerate] = await Promise.all([listFor(id, vid), isAuthed()]);
  return NextResponse.json({ comments, canModerate });
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
  return NextResponse.json({ ok: true, comment: { ...comment, mine: true } });
}

/** Hapus komentar: pemiliknya sendiri, atau admin (paksa). */
export async function DELETE(req: NextRequest) {
  const b = await req.json().catch(() => ({}));
  const postId = String(b.post ?? "");
  const cid = String(b.cid ?? "");
  if (!postId || !cid) return NextResponse.json({ error: "Parameter post & cid wajib" }, { status: 400 });

  const owner = await ownerOf(postId, cid);
  if (owner === null) return NextResponse.json({ error: "Komentar tidak ditemukan" }, { status: 404 });

  const vid = (await cookies()).get("px_vid")?.value;
  const own = !!vid && owner === vid;
  const admin = own ? false : await isAuthed();

  if (!own && !admin) {
    return NextResponse.json({ error: "Kamu hanya bisa menghapus komentarmu sendiri." }, { status: 403 });
  }
  if (own && !(await hit(`rl:cmdel:${ipOf(req)}`, 20, 60))) {
    return NextResponse.json({ error: "Terlalu cepat, tunggu sebentar ya." }, { status: 429 });
  }

  const ok = await removeComment(postId, cid);
  if (!ok) return NextResponse.json({ error: "Komentar sudah tidak ada" }, { status: 404 });
  return NextResponse.json({ ok: true, forced: !own && admin });
}

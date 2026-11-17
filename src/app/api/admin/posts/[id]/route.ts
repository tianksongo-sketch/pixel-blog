import { NextRequest, NextResponse } from "next/server";
import { deletePost, updatePost } from "@/lib/db";
import { isAuthed } from "@/lib/auth";
import { normalizeLink, sniffMime } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = ["image/webp", "image/jpeg", "image/png", "image/gif"];

function validImg(img: unknown): string | null {
  if (typeof img !== "string" || img.length < 100 || img.length > 620_000) return null;
  try {
    const mime = sniffMime(Buffer.from(img, "base64"));
    return mime && ALLOWED.includes(mime) ? img : null;
  } catch { return null; }
}

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Ctx) {
  if (!(await isAuthed())) return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  const patch: { title?: string; link?: string; img?: string } = {};
  if (b.title !== undefined) {
    const t = String(b.title).trim();
    if (!t || t.length > 120) return NextResponse.json({ error: "Judul 1–120 karakter." }, { status: 400 });
    patch.title = t;
  }
  if (b.link !== undefined) {
    const l = normalizeLink(String(b.link));
    if (!l) return NextResponse.json({ error: "Link harus http/https yang valid." }, { status: 400 });
    patch.link = l;
  }
  if (b.img !== undefined) {
    const img = validImg(b.img);
    if (!img) return NextResponse.json({ error: "Foto tidak valid (maks ±450 KB)." }, { status: 400 });
    patch.img = img;
  }
  const post = await updatePost(id, patch);
  if (!post) return NextResponse.json({ error: "Postingan tidak ditemukan" }, { status: 404 });
  return NextResponse.json({ ok: true, post });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  if (!(await isAuthed())) return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  const { id } = await params;
  await deletePost(id);
  return NextResponse.json({ ok: true });
}

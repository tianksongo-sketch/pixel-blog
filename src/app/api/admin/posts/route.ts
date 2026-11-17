import { NextRequest, NextResponse } from "next/server";
import { adminList, createPost } from "@/lib/db";
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

export async function GET() {
  if (!(await isAuthed())) return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  return NextResponse.json({ posts: await adminList() });
}

export async function POST(req: NextRequest) {
  if (!(await isAuthed())) return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const title = String(b.title ?? "").trim();
  if (!title || title.length > 120) {
    return NextResponse.json({ error: "Judul 1–120 karakter." }, { status: 400 });
  }
  const link = normalizeLink(String(b.link ?? ""));
  if (!link) return NextResponse.json({ error: "Link harus http/https yang valid." }, { status: 400 });
  const img = validImg(b.img);
  if (!img) return NextResponse.json({ error: "Foto wajib (WebP/JPEG/PNG/GIF, maks ±450 KB)." }, { status: 400 });
  const post = await createPost({ title, link, img });
  return NextResponse.json({ ok: true, post });
}

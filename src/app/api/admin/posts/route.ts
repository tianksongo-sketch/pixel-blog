import { NextRequest, NextResponse } from "next/server";
import { adminList, createPost, dbInfo, type Cover, type PostStatus } from "@/lib/db";
import { isAuthed } from "@/lib/auth";
import { bodyIsEmpty, optionalLink, parseLabels, sanitizeBody, sniffMime } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = ["image/webp", "image/jpeg", "image/png", "image/gif"];

function parseCover(input: unknown): Cover | null | undefined {
  if (input === undefined) return undefined;
  if (input === null) return null;
  const o = input as { b64?: unknown; thumb?: unknown };
  if (typeof o.b64 !== "string" || o.b64.length < 100 || o.b64.length > 620000) return undefined;
  try {
    const mime = sniffMime(Buffer.from(o.b64, "base64"));
    if (!mime || !ALLOWED.includes(mime)) return undefined;
  } catch { return undefined; }
  const thumb = typeof o.thumb === "string" && o.thumb.startsWith("data:image/") && o.thumb.length < 6000 ? o.thumb : "";
  return { b64: o.b64, thumb };
}

export async function GET() {
  if (!(await isAuthed())) return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  try {
    const [posts, diag] = await Promise.all([adminList(), dbInfo(false)]);
    return NextResponse.json({ posts, diag });
  } catch (e) {
    return NextResponse.json({ error: "Gagal membaca database: " + (e instanceof Error ? e.message : String(e)), posts: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAuthed())) return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const title = String(b.title ?? "").trim();
  if (!title || title.length > 120) return NextResponse.json({ error: "Judul wajib, maksimal 120 karakter." }, { status: 400 });
  const link = optionalLink(String(b.link ?? ""));
  if (link === null) return NextResponse.json({ error: "Link luar tidak valid. Kosongkan saja kalau tidak perlu." }, { status: 400 });
  const body = sanitizeBody(String(b.body ?? ""));
  const cover = parseCover(b.cover);
  if (b.cover !== undefined && b.cover !== null && cover === undefined) {
    return NextResponse.json({ error: "Foto sampul tidak valid (maks ±450 KB)." }, { status: 400 });
  }
  if (bodyIsEmpty(body) && !cover) return NextResponse.json({ error: "Tulis isi postingan atau tambahkan foto sampul." }, { status: 400 });
  const status: PostStatus = b.status === "draft" ? "draft" : "published";
  const author = String(b.author ?? "").trim().slice(0, 40) || "F4KUYY";
  try {
    const post = await createPost({ title, link, body, labels: parseLabels(b.labels), status, author, cover: cover ?? null });
    return NextResponse.json({ ok: true, post });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Gagal menyimpan ke database." }, { status: 500 });
  }
}

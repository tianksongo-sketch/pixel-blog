import { NextRequest, NextResponse } from "next/server";
import { deletePost, getFull, purgePost, restorePost, updatePost, type Cover, type PostInput, type PostStatus } from "@/lib/db";
import { isAuthed } from "@/lib/auth";
import { optionalLink, parseLabels, sanitizeBody, sniffMime } from "@/lib/utils";

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

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  if (!(await isAuthed())) return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  const { id } = await params;
  const post = await getFull(id);
  if (!post) return NextResponse.json({ error: "Postingan tidak ditemukan" }, { status: 404 });
  return NextResponse.json({ post });
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  if (!(await isAuthed())) return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  const patch: Partial<PostInput> = {};
  if (b.title !== undefined) {
    const t = String(b.title).trim();
    if (!t || t.length > 120) return NextResponse.json({ error: "Judul wajib, maksimal 120 karakter." }, { status: 400 });
    patch.title = t;
  }
  if (b.link !== undefined) {
    const l = optionalLink(String(b.link));
    if (l === null) return NextResponse.json({ error: "Link luar tidak valid. Kosongkan saja kalau tidak perlu." }, { status: 400 });
    patch.link = l;
  }
  if (b.body !== undefined) patch.body = sanitizeBody(String(b.body));
  if (b.labels !== undefined) patch.labels = parseLabels(b.labels);
  if (b.status !== undefined) patch.status = (b.status === "draft" ? "draft" : "published") as PostStatus;
  if (b.author !== undefined) patch.author = String(b.author).trim().slice(0, 40) || "F4KUYY";
  if (b.cover !== undefined) {
    const cover = parseCover(b.cover);
    if (b.cover !== null && cover === undefined) return NextResponse.json({ error: "Foto sampul tidak valid (maks ±450 KB)." }, { status: 400 });
    patch.cover = cover ?? null;
  }
  try {
    const post = await updatePost(id, patch);
    if (!post) return NextResponse.json({ error: "Postingan tidak ditemukan" }, { status: 404 });
    return NextResponse.json({ ok: true, post });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Gagal menyimpan perubahan." }, { status: 500 });
  }
}

/** action: "restore" | "purge" */
export async function POST(req: NextRequest, { params }: Ctx) {
  if (!(await isAuthed())) return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  const action = String(b.action ?? "");
  try {
    if (action === "restore") {
      const post = await restorePost(id);
      if (!post) return NextResponse.json({ error: "Postingan tidak ditemukan" }, { status: 404 });
      return NextResponse.json({ ok: true, post });
    }
    if (action === "purge") {
      await purgePost(id);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Aksi tidak dikenal" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Gagal memproses." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  if (!(await isAuthed())) return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  const { id } = await params;
  try {
    const post = await deletePost(id);
    if (!post) return NextResponse.json({ error: "Postingan tidak ditemukan" }, { status: 404 });
    return NextResponse.json({ ok: true, post });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Gagal menghapus." }, { status: 500 });
  }
}

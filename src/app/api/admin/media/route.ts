import { NextRequest, NextResponse } from "next/server";
import { putMedia } from "@/lib/db";
import { isAuthed } from "@/lib/auth";
import { sniffMime } from "@/lib/utils";
import { hit, ipOf } from "@/lib/rate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = ["image/webp", "image/jpeg", "image/png", "image/gif"];

export async function POST(req: NextRequest) {
  if (!(await isAuthed())) return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  if (!(await hit(`rl:media:${ipOf(req)}`, 40, 300))) {
    return NextResponse.json({ error: "Terlalu banyak unggahan. Tunggu sebentar." }, { status: 429 });
  }
  const b = await req.json().catch(() => ({}));
  const img = typeof b.img === "string" ? b.img : "";
  if (img.length < 100 || img.length > 620000) {
    return NextResponse.json({ error: "Ukuran foto tidak valid." }, { status: 400 });
  }
  let mime: string | null = null;
  try { mime = sniffMime(Buffer.from(img, "base64")); } catch { mime = null; }
  if (!mime || !ALLOWED.includes(mime)) {
    return NextResponse.json({ error: "Format foto harus WebP, JPEG, PNG, atau GIF." }, { status: 400 });
  }
  const id = await putMedia(img);
  return NextResponse.json({ ok: true, id, url: `/api/img/${id}` });
}

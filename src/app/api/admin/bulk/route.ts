import { NextRequest, NextResponse } from "next/server";
import { deletePost, updatePost, type PostStatus } from "@/lib/db";
import { isAuthed } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!(await isAuthed())) return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const ids = Array.isArray(body.ids)
    ? [...new Set(body.ids.filter((id: unknown): id is string => typeof id === "string" && /^[a-zA-Z0-9_-]{1,80}$/.test(id)))]
    : [];
  const action = body.action;
  if (!ids.length || ids.length > 50) return NextResponse.json({ error: "Pilih 1–50 postingan." }, { status: 400 });
  if (action !== "trash" && action !== "publish" && action !== "draft") {
    return NextResponse.json({ error: "Aksi tidak dikenal." }, { status: 400 });
  }

  let completed = 0;
  for (const id of ids) {
    try {
      const result = action === "trash"
        ? await deletePost(id)
        : await updatePost(id, { status: (action === "publish" ? "published" : "draft") as PostStatus });
      if (result) completed++;
    } catch { /* operasi lain tetap diproses */ }
  }
  return NextResponse.json({ ok: true, completed, failed: ids.length - completed });
}

import { NextRequest, NextResponse } from "next/server";
import { deleteComment } from "@/lib/db";
import { isAuthed } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(req: NextRequest) {
  if (!(await isAuthed())) return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const post = String(b.post ?? "");
  const cid = String(b.cid ?? "");
  if (!post || !cid) return NextResponse.json({ error: "Parameter post & cid wajib" }, { status: 400 });
  const ok = await deleteComment(post, cid);
  return NextResponse.json({ ok });
}

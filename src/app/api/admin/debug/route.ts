import { NextResponse } from "next/server";
import { dbInfo, repairIndex } from "@/lib/db";
import { isAuthed } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAuthed())) return NextResponse.json({ error: "Masuk dulu ke /admin, lalu buka lagi halaman ini." }, { status: 401 });
  try {
    return NextResponse.json(await dbInfo(true));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function POST() {
  if (!(await isAuthed())) return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  try {
    const hasil = await repairIndex();
    return NextResponse.json({ ok: true, ...hasil, diag: await dbInfo(false) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Gagal memperbaiki indeks." }, { status: 500 });
  }
}

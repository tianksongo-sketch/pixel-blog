import { NextResponse } from "next/server";
import { dbInfo } from "@/lib/db";
import { isAuthed } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Masuk dulu ke /admin, lalu buka lagi halaman ini." }, { status: 401 });
  }
  return NextResponse.json(await dbInfo());
}

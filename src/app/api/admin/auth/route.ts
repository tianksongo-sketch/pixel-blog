import { NextRequest, NextResponse } from "next/server";
import { dbReady } from "@/lib/db";
import {
  attachSession, changeAdminPassword, clearSession,
  hasAdminPassword, isAuthed, setupAdminPassword, verifyAdminPassword
} from "@/lib/auth";
import { clear, fail, ipOf, peek } from "@/lib/rate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    demo: !dbReady,
    needsSetup: !(await hasAdminPassword()),
    authed: await isAuthed()
  });
}

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}));
  const action = String(b.action ?? "");
  const ip = ipOf(req);

  if (action === "setup") {
    if (await hasAdminPassword()) {
      return NextResponse.json({ error: "Password admin sudah ada." }, { status: 403 });
    }
    const pw = String(b.password ?? "");
    if (pw.length < 8) return NextResponse.json({ error: "Password minimal 8 karakter." }, { status: 400 });
    await setupAdminPassword(pw);
    const res = NextResponse.json({ ok: true });
    await attachSession(res);
    return res;
  }

  if (action === "login") {
    const key = `rl:login:${ip}`;
    if (!(await peek(key, 5))) {
      return NextResponse.json({ error: "Terlalu banyak percobaan gagal. Coba lagi dalam 10 menit." }, { status: 429 });
    }
    const pw = String(b.password ?? "");
    if (!(await verifyAdminPassword(pw))) {
      await fail(key, 600);
      return NextResponse.json({ error: "Password salah." }, { status: 401 });
    }
    await clear(key);
    const res = NextResponse.json({ ok: true });
    await attachSession(res);
    return res;
  }

  if (action === "logout") {
    const res = NextResponse.json({ ok: true });
    clearSession(res);
    return res;
  }

  if (action === "password") {
    if (!(await isAuthed())) return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
    const next = String(b.next ?? "");
    if (next.length < 8) return NextResponse.json({ error: "Password baru minimal 8 karakter." }, { status: 400 });
    const r = await changeAdminPassword(String(b.current ?? ""), next);
    if (r === "env") return NextResponse.json({ error: "Password diatur lewat env ADMIN_PASSWORD, ubah di pengaturan Vercel." }, { status: 400 });
    if (r === "bad") return NextResponse.json({ error: "Password lama salah." }, { status: 401 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Aksi tidak dikenal" }, { status: 400 });
}

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { hit, ipOf } from "@/lib/rate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const consent = (await cookies()).get("px_consent")?.value;
  if (consent !== "1") return NextResponse.json({ needConsent: true }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  const name = String(b.name ?? "").replace(/[\u0000-\u001F\u007F]/g, "").trim();
  if (name.length < 2 || name.length > 24) {
    return NextResponse.json({ error: "Nama harus 2–24 karakter." }, { status: 400 });
  }
  if (!(await hit(`rl:name:${ipOf(req)}`, 10, 60))) {
    return NextResponse.json({ error: "Terlalu cepat, coba lagi sebentar lagi." }, { status: 429 });
  }
  const res = NextResponse.json({ ok: true, name });
  res.cookies.set("px_name", name, { httpOnly: false, secure: true, sameSite: "lax", path: "/", maxAge: 365 * 24 * 3600 });
  return res;
}

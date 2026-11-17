import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isSeed } from "@/lib/theme";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}));
  const seed = typeof b.seed === "string" ? b.seed.toUpperCase() : "";
  const mode = b.mode === "light" || b.mode === "dark" ? b.mode : "auto";
  if (!isSeed(seed)) return NextResponse.json({ error: "Seed tidak valid" }, { status: 400 });
  const res = NextResponse.json({ ok: true });
  const consent = (await cookies()).get("px_consent")?.value;
  if (consent === "1") {
    const opts = { httpOnly: false, secure: true, sameSite: "lax" as const, path: "/", maxAge: 365 * 24 * 3600 };
    res.cookies.set("px_theme", seed, opts);
    res.cookies.set("px_mode", mode, opts);
  }
  return res;
}

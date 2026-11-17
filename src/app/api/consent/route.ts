import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { isSeed } from "@/lib/theme";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}));
  const allow = b.allow === true;
  const res = NextResponse.json({ ok: true, allow });
  const base = { secure: true, sameSite: "lax" as const, path: "/", maxAge: 365 * 24 * 3600 };
  res.cookies.set("px_consent", allow ? "1" : "0", { ...base, httpOnly: true });
  if (allow) {
    const c = await cookies();
    const vid = c.get("px_vid")?.value || randomUUID();
    res.cookies.set("px_vid", vid, { ...base, httpOnly: true });
    const seed = typeof b.seed === "string" ? b.seed.toUpperCase() : "";
    if (isSeed(seed)) res.cookies.set("px_theme", seed, { ...base, httpOnly: false });
  }
  return res;
}

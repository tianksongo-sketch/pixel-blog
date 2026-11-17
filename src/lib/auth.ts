import { cookies } from "next/headers";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import type { NextResponse } from "next/server";
import { kvGet, kvSet } from "./db";

const ENV_PW = process.env.ADMIN_PASSWORD || "";
const COOKIE = "px_admin";
const MAX_AGE = 7 * 24 * 3600;

export async function hasAdminPassword(): Promise<boolean> {
  if (ENV_PW) return true;
  return !!(await kvGet("admin:hash"));
}

function hashPw(pw: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(pw, salt, 64).toString("hex")}`;
}

function checkPw(pw: string, stored: string): boolean {
  try {
    const [salt, h] = stored.split(":");
    const cand = scryptSync(pw, salt, 64);
    const ref = Buffer.from(h, "hex");
    return cand.length === ref.length && timingSafeEqual(cand, ref);
  } catch { return false; }
}

export async function setupAdminPassword(pw: string): Promise<void> {
  await kvSet("admin:hash", hashPw(pw));
}

export async function verifyAdminPassword(pw: string): Promise<boolean> {
  if (ENV_PW) return pw === ENV_PW;
  const stored = await kvGet("admin:hash");
  return !!stored && checkPw(pw, stored);
}

export async function changeAdminPassword(cur: string, next: string): Promise<"ok" | "bad" | "env"> {
  if (ENV_PW) return "env";
  if (!(await verifyAdminPassword(cur))) return "bad";
  await setupAdminPassword(next);
  return "ok";
}

async function secret(): Promise<string> {
  let s = await kvGet("admin:secret");
  if (!s) { s = randomBytes(32).toString("hex"); await kvSet("admin:secret", s); }
  return s;
}

function safeEq(a: string, b: string): boolean {
  const ba = Buffer.from(a); const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export async function attachSession(res: NextResponse): Promise<void> {
  const exp = Date.now() + MAX_AGE * 1000;
  const sig = createHmac("sha256", await secret()).update(`px.${exp}`).digest("hex");
  res.cookies.set(COOKIE, `${exp}.${sig}`, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: MAX_AGE });
}

export function clearSession(res: NextResponse): void {
  res.cookies.set(COOKIE, "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 });
}

export async function isAuthed(): Promise<boolean> {
  const v = (await cookies()).get(COOKIE)?.value;
  if (!v) return false;
  const [expS, sig] = v.split(".");
  const exp = Number(expS);
  if (!exp || !sig || exp < Date.now()) return false;
  const want = createHmac("sha256", await secret()).update(`px.${exp}`).digest("hex");
  return safeEq(sig, want);
}

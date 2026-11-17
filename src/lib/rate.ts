import { rlBump, rlCount, rlReset } from "./db";

export function ipOf(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip") || "local";
}

/** Hitung semua percobaan (like/komentar). true = boleh. */
export async function hit(key: string, limit: number, ttlSec: number): Promise<boolean> {
  return (await rlBump(key, ttlSec)) <= limit;
}

/** Cek tanpa menambah (login). true = masih boleh coba. */
export async function peek(key: string, limit: number): Promise<boolean> {
  return (await rlCount(key)) < limit;
}

export async function fail(key: string, ttlSec: number): Promise<void> {
  await rlBump(key, ttlSec);
}

export async function clear(key: string): Promise<void> {
  await rlReset(key);
}

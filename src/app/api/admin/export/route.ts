import { NextResponse } from "next/server";
import { redis, listCards, getFull, getImg, getComments } from "@/lib/db";
import { isAuthed } from "@/lib/auth";
import { BUILD } from "@/lib/version";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function scanKeys(pattern: string): Promise<string[]> {
  if (!redis) return [];
  const out: string[] = [];
  try {
    let cursor = "0";
    for (let i = 0; i < 40; i++) {
      const r = (await redis.scan(cursor, { match: pattern, count: 200 })) as [string, string[]];
      (r?.[1] ?? []).forEach((k) => out.push(String(k)));
      const next = String(r?.[0] ?? "0");
      if (!next || next === "0") break;
      cursor = next;
    }
  } catch { /* lanjut fallback */ }
  return [...new Set(out)];
}

function parse<T>(raw: unknown): T | null {
  if (raw == null) return null;
  if (typeof raw === "string") { try { return JSON.parse(raw) as T; } catch { return null; } }
  if (typeof raw === "object") return raw as T;
  return null;
}

export async function GET() {
  if (!(await isAuthed())) return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });

  const ids = new Set<string>();
  if (redis) {
    try { ((await redis.zrange("posts", 0, -1)) as unknown[]).forEach((x) => ids.add(String(x))); } catch { /* abaikan */ }
    for (const k of await scanKeys("px:post:*")) ids.add(k.slice("px:post:".length));
    for (const k of await scanKeys("post:*")) {
      const id = k.slice("post:".length);
      if (id && !id.includes(":")) ids.add(id);
    }
  } else {
    (await listCards(true)).forEach((c) => ids.add(c.id));
  }

  const posts: unknown[] = [];
  for (const id of ids) {
    let record: Record<string, unknown> | null = null;
    if (redis) {
      record = parse<Record<string, unknown>>(await redis.get(`px:post:${id}`).catch(() => null));
      if (!record) {
        const h = await redis.hgetall(`post:${id}`).catch(() => null);
        if (h && typeof h === "object") record = h as Record<string, unknown>;
      }
    }
    if (!record) {
      const full = await getFull(id).catch(() => null);
      if (full) record = { ...full };
    }
    if (!record) continue;

    const img = await getImg(id).catch(() => null);
    const comments = await getComments(id).catch(() => []);
    let likes: string[] = [];
    if (redis) {
      try { likes = ((await redis.smembers(`likes:${id}`)) as unknown[]).map(String); } catch { likes = []; }
    }
    posts.push({ id, record, img, comments, likes });
  }

  const payload = {
    format: "f4kuyy-backup",
    version: 1,
    build: BUILD,
    exportedAt: new Date().toISOString(),
    count: posts.length,
    posts
  };

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="f4kuyy-backup-${stamp}.json"`,
      "Cache-Control": "no-store"
    }
  });
}

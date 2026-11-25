import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/db";
import { isAuthed } from "@/lib/auth";
import { uid } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const S = (v: unknown) => (v == null ? "" : String(v));
const N = (v: unknown, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };

function parse<T>(raw: unknown): T | null {
  if (raw == null) return null;
  if (typeof raw === "string") { try { return JSON.parse(raw) as T; } catch { return null; } }
  if (typeof raw === "object") return raw as T;
  return null;
}

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
  } catch { /* abaikan */ }
  return [...new Set(out)];
}

async function rebuildIndex(): Promise<number> {
  if (!redis) return 0;
  const ids = new Set<string>();
  try { ((await redis.zrange("posts", 0, -1)) as unknown[]).forEach((x) => ids.add(String(x))); } catch { /* abaikan */ }
  for (const k of await scanKeys("px:post:*")) ids.add(k.slice("px:post:".length));
  const cards: Record<string, unknown>[] = [];
  for (const id of ids) {
    const rec = parse<Record<string, unknown>>(await redis.get(`px:post:${id}`).catch(() => null));
    if (!rec || !S(rec.title)) continue;
    const { body, ...card } = rec;
    void body;
    cards.push({ ...card, id });
  }
  cards.sort((a, b) => N(b.createdAt) - N(a.createdAt));
  await redis.set("px:index", JSON.stringify(cards));
  return cards.length;
}

export async function POST(req: NextRequest) {
  if (!(await isAuthed())) return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  if (!redis) return NextResponse.json({ error: "Mode demo: sambungkan Upstash dulu." }, { status: 400 });

  const b = await req.json().catch(() => ({}));
  const action = String(b.action ?? "");
  const ids: string[] = Array.isArray(b.ids)
    ? b.ids.map((x: unknown) => String(x).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40)).filter(Boolean).slice(0, 60)
    : [];
  if (!ids.length) return NextResponse.json({ error: "Tidak ada yang dipilih" }, { status: 400 });

  let changed = 0;
  const created: string[] = [];
  const missing: string[] = [];

  for (const id of ids) {
    const rec = parse<Record<string, unknown>>(await redis.get(`px:post:${id}`).catch(() => null));
    if (!rec) { missing.push(id); continue; }

    if (action === "purge") {
      await redis.del(`px:post:${id}`);
      await redis.del(`post:${id}`);
      await redis.del(`img:${id}`);
      await redis.del(`likes:${id}`);
      await redis.del(`comments:${id}`);
      await redis.zrem("posts", id).catch(() => {});
      changed++;
      continue;
    }

    if (action === "duplicate") {
      const newId = uid(12);
      const now = Date.now();
      const copy = {
        ...rec,
        id: newId,
        title: `${S(rec.title).slice(0, 108)} (salinan)`,
        status: "draft",
        createdAt: now,
        updatedAt: now,
        ver: 1,
        deletedAt: 0
      };
      await redis.set(`px:post:${newId}`, JSON.stringify(copy));
      await redis.zadd("posts", { score: now, member: newId }).catch(() => {});
      const img = await redis.get(`img:${id}`).catch(() => null);
      if (typeof img === "string" && img.length) await redis.set(`img:${newId}`, img);
      created.push(newId);
      changed++;
      continue;
    }

    const next = { ...rec, updatedAt: Date.now(), ver: N(rec.ver, 1) + 1 };
    if (action === "publish") Object.assign(next, { status: "published", deletedAt: 0 });
    else if (action === "draft") Object.assign(next, { status: "draft", deletedAt: 0 });
    else if (action === "trash") Object.assign(next, { deletedAt: Date.now() });
    else if (action === "restore") Object.assign(next, { deletedAt: 0 });
    else return NextResponse.json({ error: "Aksi tidak dikenal" }, { status: 400 });

    await redis.set(`px:post:${id}`, JSON.stringify(next));
    await redis.zadd("posts", { score: N(next.createdAt, Date.now()), member: id }).catch(() => {});
    changed++;
  }

  const indexed = await rebuildIndex();
  return NextResponse.json({ ok: true, action, changed, created, missing, indexed });
}

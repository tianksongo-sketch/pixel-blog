import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/db";
import { isAuthed } from "@/lib/auth";
import { sanitizeBody } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Incoming = {
  id?: unknown;
  record?: Record<string, unknown>;
  img?: unknown;
  comments?: unknown;
  likes?: unknown;
};

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
  if (!redis) return NextResponse.json({ error: "Mode demo: sambungkan Upstash dulu sebelum memulihkan cadangan." }, { status: 400 });

  const b = await req.json().catch(() => ({}));
  const items: Incoming[] = Array.isArray(b.posts) ? b.posts.slice(0, 6) : [];
  const overwrite = b.overwrite === true;
  const finalize = b.finalize === true;

  let written = 0;
  let skipped = 0;

  for (const it of items) {
    const id = S(it.id).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40);
    const rec = it.record && typeof it.record === "object" ? it.record : null;
    if (!id || !rec || !S(rec.title)) { skipped++; continue; }

    const exists = await redis.get(`px:post:${id}`).catch(() => null);
    if (exists && !overwrite) { skipped++; continue; }

    const now = Date.now();
    const createdAt = N(rec.createdAt, now);
    const labels = Array.isArray(rec.labels) ? rec.labels.map(String).slice(0, 5) : (parse<string[]>(rec.labels) ?? []);
    const clean = {
      id,
      title: S(rec.title).slice(0, 120),
      link: S(rec.link),
      body: sanitizeBody(S(rec.body)),
      createdAt,
      updatedAt: N(rec.updatedAt, createdAt),
      ver: N(rec.ver, 1),
      labels,
      status: S(rec.status) === "draft" ? "draft" : "published",
      author: S(rec.author) || "F4KUYY",
      excerpt: S(rec.excerpt),
      readMin: Math.max(1, N(rec.readMin, 1)),
      hasCover: rec.hasCover === true || S(rec.hasCover) === "1",
      thumb: S(rec.thumb).startsWith("data:image/") ? S(rec.thumb) : "",
      deletedAt: N(rec.deletedAt, 0)
    };

    await redis.set(`px:post:${id}`, JSON.stringify(clean));
    await redis.zadd("posts", { score: createdAt, member: id }).catch(() => {});

    if (typeof it.img === "string" && it.img.length > 100 && it.img.length < 900000) {
      await redis.set(`img:${id}`, it.img);
    }

    const comments = Array.isArray(it.comments) ? it.comments : [];
    if (comments.length) {
      const rows = comments.slice(0, 1000).map((c) => {
        const o = (c ?? {}) as Record<string, unknown>;
        return JSON.stringify({
          id: S(o.id) || Math.random().toString(36).slice(2, 12),
          name: S(o.name).slice(0, 24) || "Anon",
          text: S(o.text).slice(0, 3000),
          ts: N(o.ts, now),
          vid: S(o.vid) || "restored"
        });
      });
      await redis.del(`comments:${id}`);
      await redis.rpush(`comments:${id}`, ...rows);
    }

    const likes = Array.isArray(it.likes) ? it.likes.map(String).slice(0, 5000) : [];
    if (likes.length) {
      await redis.del(`likes:${id}`);
      await redis.sadd(`likes:${id}`, ...likes);
    }

    written++;
  }

  const indexed = finalize ? await rebuildIndex() : 0;
  return NextResponse.json({ ok: true, written, skipped, indexed, finalized: finalize });
}

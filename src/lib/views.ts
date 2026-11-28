import { redis } from "./db";

const VKEY = (id: string) => `views:${id}`;
const SEEN = (id: string, who: string, day: string) => `vseen:${id}:${day}:${who}`;

type Mem = { views: Map<string, Set<string>>; seen: Map<string, number> };
const g = globalThis as unknown as { __pxviews?: Mem };
function mem(): Mem {
  if (!g.__pxviews) g.__pxviews = { views: new Map(), seen: new Map() };
  return g.__pxviews;
}

const today = () => new Date().toISOString().slice(0, 10);

export async function addView(id: string, who: string): Promise<number> {
  if (!id || !who) return getViews(id);
  if (!redis) {
    const m = mem();
    const key = SEEN(id, who, today());
    if (!m.seen.has(key)) {
      m.seen.set(key, Date.now());
      if (!m.views.has(id)) m.views.set(id, new Set());
      m.views.get(id)!.add(who);
    }
    return m.views.get(id)?.size ?? 0;
  }
  try {
    const first = await redis.set(SEEN(id, who, today()), "1", { nx: true, ex: 86400 });
    if (first) await redis.pfadd(VKEY(id), who);
    return Number(await redis.pfcount(VKEY(id))) || 0;
  } catch {
    return getViews(id);
  }
}

export async function getViews(id: string): Promise<number> {
  if (!id) return 0;
  if (!redis) return mem().views.get(id)?.size ?? 0;
  try { return Number(await redis.pfcount(VKEY(id))) || 0; } catch { return 0; }
}

export async function getViewsMany(ids: string[]): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  const vals = await Promise.all(ids.map((id) => getViews(id)));
  ids.forEach((id, i) => { out[id] = vals[i]; });
  return out;
}

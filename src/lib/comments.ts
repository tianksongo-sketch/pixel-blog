import { redis, deleteComment } from "./db";

export type OwnedComment = { id: string; name: string; text: string; ts: number; vid: string };
export type PublicComment = { id: string; name: string; text: string; ts: number; mine: boolean };

type Mem = { comments?: Map<string, OwnedComment[]> };
const g = globalThis as unknown as { __pxmem?: Mem };

const S = (v: unknown) => (v == null ? "" : String(v));
const N = (v: unknown, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };

function parseRow(x: unknown): OwnedComment | null {
  let o: unknown = x;
  if (typeof x === "string") { try { o = JSON.parse(x); } catch { return null; } }
  if (!o || typeof o !== "object") return null;
  const r = o as Record<string, unknown>;
  const id = S(r.id);
  if (!id || r.text == null) return null;
  return { id, name: S(r.name) || "Anon", text: S(r.text), ts: N(r.ts, Date.now()), vid: S(r.vid) };
}

export async function readOwned(postId: string): Promise<OwnedComment[]> {
  if (!postId) return [];
  if (!redis) return [...(g.__pxmem?.comments?.get(postId) ?? [])];
  try {
    const arr = (await redis.lrange(`comments:${postId}`, 0, -1)) as unknown[];
    return arr.map(parseRow).filter((c): c is OwnedComment => !!c);
  } catch { return []; }
}

export async function listFor(postId: string, vid?: string): Promise<PublicComment[]> {
  const rows = await readOwned(postId);
  return rows.map((c) => ({
    id: c.id, name: c.name, text: c.text, ts: c.ts,
    mine: !!vid && c.vid === vid
  }));
}

export async function ownerOf(postId: string, cid: string): Promise<string | null> {
  const rows = await readOwned(postId);
  const hit = rows.find((c) => c.id === cid);
  return hit ? hit.vid : null;
}

export async function removeComment(postId: string, cid: string): Promise<boolean> {
  return deleteComment(postId, cid);
}

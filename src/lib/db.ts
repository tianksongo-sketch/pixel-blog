import { Redis } from "@upstash/redis";
import { uid } from "./utils";

export type Post = { id: string; title: string; link: string; createdAt: number; ver: number };
export type Comment = { id: string; name: string; text: string; ts: number };
type StoredComment = Comment & { vid: string };
export type PostWithStats = Post & { likes: number; comments: number; liked: boolean };

const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

export const redis = url && token ? new Redis({ url, token }) : null;
export const dbReady = !!redis;

/* ---------- Fallback memori (mode demo, tanpa Redis) ---------- */
type Mem = {
  posts: Map<string, Post>;
  imgs: Map<string, string>;
  likes: Map<string, Set<string>>;
  comments: Map<string, StoredComment[]>;
  kv: Map<string, string>;
  rl: Map<string, { n: number; exp: number }>;
  seeded: boolean;
};
const g = globalThis as unknown as { __pxmem?: Mem };

function svgImg(a: string, b: string, label: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="1200" height="900" fill="url(#g)"/><circle cx="960" cy="170" r="230" fill="#ffffff" opacity="0.18"/><circle cx="210" cy="740" r="310" fill="#000000" opacity="0.10"/><circle cx="600" cy="450" r="150" fill="#ffffff" opacity="0.22"/><text x="600" y="472" font-family="Arial, sans-serif" font-size="60" font-weight="bold" fill="#ffffff" text-anchor="middle" opacity="0.92">${label}</text></svg>`;
  return Buffer.from(svg).toString("base64");
}

function seedDemo(m: Mem) {
  m.seeded = true;
  const base = 1762900000000;
  const demo: Array<[string, string, string, string, string, number]> = [
    ["demo-senja", "Menikmati senja dari atap kota", "https://blog.google/products/pixel/", "#FA7B17", "#EA4335", base],
    ["demo-material", "Material You: warna yang lahir dari kamu", "https://m3.material.io/", "#4285F4", "#A142F4", base - 3600_000 * 20],
    ["demo-pixel", "Pixel Feature Drop: hal kecil yang bikin senang", "https://blog.google/", "#34A853", "#24C1E0", base - 3600_000 * 46]
  ];
  for (const [id, title, link, a, b, ts] of demo) {
    m.posts.set(id, { id, title, link, createdAt: ts, ver: 1 });
    m.imgs.set(id, svgImg(a, b, "Pixel Blog"));
    m.likes.set(id, new Set());
    m.comments.set(id, []);
  }
  m.comments.set("demo-material", [
    { id: "c1demo01", name: "Maya", text: "Paletnya lucu banget! Inspirasinya bisa lihat di https://m3.material.io ya.", ts: base - 3600_000 * 5, vid: "demo" },
    { id: "c2demo01", name: "Raka", text: "Nunggu tema gelapnya dari dulu, akhirnya datang juga.", ts: base - 3600_000 * 2, vid: "demo" }
  ]);
}

function mem(): Mem {
  if (!g.__pxmem) {
    g.__pxmem = { posts: new Map(), imgs: new Map(), likes: new Map(), comments: new Map(), kv: new Map(), rl: new Map(), seeded: false };
  }
  if (!g.__pxmem.seeded) seedDemo(g.__pxmem);
  return g.__pxmem;
}

/* ---------- Post ---------- */
function coercePost(id: string, h: Record<string, unknown> | null): Post | null {
  if (!h || h.title == null) return null;
  return { id, title: String(h.title), link: String(h.link ?? ""), createdAt: Number(h.createdAt) || 0, ver: Number(h.ver) || 1 };
}

export async function listPosts(): Promise<Post[]> {
  if (redis) {
    const ids = (await redis.zrange("posts", 0, -1, { rev: true })) as string[];
    const out = await Promise.all(ids.map(async (id) => coercePost(String(id), await redis.hgetall(`post:${id}`))));
    return out.filter((p): p is Post => !!p);
  }
  return [...mem().posts.values()].sort((a, b) => b.createdAt - a.createdAt);
}

export async function getPost(id: string): Promise<Post | null> {
  if (redis) return coercePost(id, await redis.hgetall(`post:${id}`));
  return mem().posts.get(id) ?? null;
}

export async function getImg(id: string): Promise<string | null> {
  if (redis) {
    const v = await redis.get(`img:${id}`);
    return v == null ? null : String(v);
  }
  return mem().imgs.get(id) ?? null;
}

export async function createPost(data: { title: string; link: string; img: string }): Promise<Post> {
  const id = uid(12);
  const post: Post = { id, title: data.title, link: data.link, createdAt: Date.now(), ver: 1 };
  if (redis) {
    await Promise.all([
      redis.zadd("posts", { score: post.createdAt, member: id }),
      redis.hset(`post:${id}`, { title: post.title, link: post.link, createdAt: post.createdAt, ver: post.ver }),
      redis.set(`img:${id}`, data.img)
    ]);
  } else {
    const m = mem();
    m.posts.set(id, post);
    m.imgs.set(id, data.img);
    m.likes.set(id, new Set());
    m.comments.set(id, []);
  }
  return post;
}

export async function updatePost(id: string, patch: { title?: string; link?: string; img?: string }): Promise<Post | null> {
  const cur = await getPost(id);
  if (!cur) return null;
  const next: Post = { ...cur, title: patch.title ?? cur.title, link: patch.link ?? cur.link, ver: cur.ver + 1 };
  if (redis) {
    await redis.hset(`post:${id}`, { title: next.title, link: next.link, createdAt: next.createdAt, ver: next.ver });
    if (patch.img) await redis.set(`img:${id}`, patch.img);
  } else {
    mem().posts.set(id, next);
    if (patch.img) mem().imgs.set(id, patch.img);
  }
  return next;
}

export async function deletePost(id: string): Promise<void> {
  if (redis) {
    await Promise.all([
      redis.zrem("posts", id),
      redis.del(`post:${id}`), redis.del(`img:${id}`), redis.del(`likes:${id}`), redis.del(`comments:${id}`)
    ]);
  } else {
    const m = mem();
    m.posts.delete(id); m.imgs.delete(id); m.likes.delete(id); m.comments.delete(id);
  }
}

/* ---------- Like ---------- */
export async function likeCount(id: string): Promise<number> {
  if (redis) return (await redis.scard(`likes:${id}`)) || 0;
  return mem().likes.get(id)?.size ?? 0;
}

export async function isLiked(id: string, vid: string): Promise<boolean> {
  if (redis) return (await redis.sismember(`likes:${id}`, vid)) === 1;
  return mem().likes.get(id)?.has(vid) ?? false;
}

export async function toggleLike(id: string, vid: string): Promise<{ liked: boolean; count: number }> {
  if (redis) {
    const key = `likes:${id}`;
    const has = (await redis.sismember(key, vid)) === 1;
    if (has) await redis.srem(key, vid); else await redis.sadd(key, vid);
    return { liked: !has, count: (await redis.scard(key)) || 0 };
  }
  const m = mem();
  if (!m.likes.has(id)) m.likes.set(id, new Set());
  const set = m.likes.get(id)!;
  const has = set.has(vid);
  if (has) set.delete(vid); else set.add(vid);
  return { liked: !has, count: set.size };
}

/* ---------- Komentar ---------- */
function parseComment(x: unknown): StoredComment | null {
  try {
    const o = typeof x === "string" ? JSON.parse(x) : x;
    if (o && typeof o === "object" && "id" in o && "text" in o) return o as StoredComment;
    return null;
  } catch { return null; }
}
const pub = (c: StoredComment): Comment => ({ id: c.id, name: c.name, text: c.text, ts: c.ts });

export async function getComments(id: string): Promise<Comment[]> {
  if (redis) {
    const arr = (await redis.lrange(`comments:${id}`, 0, -1)) as unknown[];
    return arr.map(parseComment).filter((c): c is StoredComment => !!c).map(pub);
  }
  return (mem().comments.get(id) ?? []).map(pub);
}

export async function commentCount(id: string): Promise<number> {
  if (redis) return (await redis.llen(`comments:${id}`)) || 0;
  return mem().comments.get(id)?.length ?? 0;
}

export async function addComment(id: string, c: { name: string; text: string; vid: string }): Promise<Comment> {
  const full: StoredComment = { id: uid(10), name: c.name, text: c.text, ts: Date.now(), vid: c.vid };
  if (redis) {
    await redis.rpush(`comments:${id}`, JSON.stringify(full));
    await redis.ltrim(`comments:${id}`, -1000, -1);
  } else {
    const m = mem();
    if (!m.comments.has(id)) m.comments.set(id, []);
    m.comments.get(id)!.push(full);
  }
  return pub(full);
}

export async function deleteComment(postId: string, cid: string): Promise<boolean> {
  if (redis) {
    const key = `comments:${postId}`;
    const arr = (await redis.lrange(key, 0, -1)) as unknown[];
    const parsed = arr.map(parseComment).filter((c): c is StoredComment => !!c);
    const rest = parsed.filter((c) => c.id !== cid);
    if (rest.length === parsed.length) return false;
    await redis.del(key);
    if (rest.length) await redis.rpush(key, ...rest.map((c) => JSON.stringify(c)));
    return true;
  }
  const m = mem();
  const list = m.comments.get(postId) ?? [];
  const rest = list.filter((c) => c.id !== cid);
  m.comments.set(postId, rest);
  return rest.length !== list.length;
}

/* ---------- Feed & admin ---------- */
export async function getFeed(vid?: string): Promise<PostWithStats[]> {
  const posts = await listPosts();
  return Promise.all(posts.map(async (p) => {
    const [likes, comments, liked] = await Promise.all([
      likeCount(p.id), commentCount(p.id), vid ? isLiked(p.id, vid) : Promise.resolve(false)
    ]);
    return { ...p, likes, comments, liked };
  }));
}

export async function adminList(): Promise<Array<PostWithStats & { commentsList: Comment[] }>> {
  const feed = await getFeed();
  return Promise.all(feed.map(async (p) => ({ ...p, commentsList: await getComments(p.id) })));
}

/* ---------- KV & rate limit ---------- */
export async function kvGet(key: string): Promise<string | null> {
  if (redis) {
    const v = await redis.get(key);
    return v == null ? null : String(v);
  }
  return mem().kv.get(key) ?? null;
}

export async function kvSet(key: string, val: string): Promise<void> {
  if (redis) { await redis.set(key, val); return; }
  mem().kv.set(key, val);
}

export async function rlCount(key: string): Promise<number> {
  if (redis) return Number(await redis.get(key)) || 0;
  const e = mem().rl.get(key);
  if (!e) return 0;
  if (e.exp < Date.now()) { mem().rl.delete(key); return 0; }
  return e.n;
}

export async function rlBump(key: string, ttlSec: number): Promise<number> {
  if (redis) {
    const n = await redis.incr(key);
    if (n === 1) await redis.expire(key, ttlSec);
    return n;
  }
  const m = mem();
  const e = m.rl.get(key);
  if (!e || e.exp < Date.now()) { m.rl.set(key, { n: 1, exp: Date.now() + ttlSec * 1000 }); return 1; }
  e.n += 1;
  return e.n;
}

export async function rlReset(key: string): Promise<void> {
  if (redis) { await redis.del(key); return; }
  mem().rl.delete(key);
}

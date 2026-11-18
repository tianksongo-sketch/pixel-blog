import { Redis } from "@upstash/redis";
import { htmlToText, makeExcerpt, readingMinutes, uid } from "./utils";
import { BUILD } from "./version";

export type PostStatus = "published" | "draft";
export type PostCard = {
  id: string; title: string; link: string; createdAt: number; updatedAt: number; ver: number;
  labels: string[]; status: PostStatus; author: string; excerpt: string; readMin: number;
  hasCover: boolean; thumb: string;
};
export type PostFull = PostCard & { body: string };
export type PostWithStats = PostCard & { likes: number; comments: number; liked: boolean };
export type Comment = { id: string; name: string; text: string; ts: number };
type StoredComment = Comment & { vid: string };
export type Cover = { b64: string; thumb: string };
export type PostInput = { title: string; link: string; body: string; labels: string[]; status: PostStatus; author: string; cover?: Cover | null };

const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
export const redis = url && token ? new Redis({ url, token }) : null;
export const dbReady = !!redis;

const INDEX = "px:index";
const PKEY = (id: string) => `px:post:${id}`;
const IKEY = (id: string) => `img:${id}`;
const LKEY = (id: string) => `post:${id}`;
const ZSET = "posts";

const S = (v: unknown) => (v == null ? "" : String(v));
const N = (v: unknown, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };

function json<T>(raw: unknown): T | null {
  if (raw == null) return null;
  if (typeof raw === "string") { try { return JSON.parse(raw) as T; } catch { return null; } }
  if (typeof raw === "object") return raw as T;
  return null;
}
function labelsOf(v: unknown): string[] {
  const arr = Array.isArray(v) ? v : json<unknown[]>(v) ?? [];
  if (!Array.isArray(arr)) return [];
  return arr.map((x) => S(x).trim()).filter(Boolean).slice(0, 5);
}
function normCard(raw: unknown, idFallback = ""): PostCard | null {
  const o = (typeof raw === "object" && raw ? raw : json<Record<string, unknown>>(raw)) as Record<string, unknown> | null;
  if (!o) return null;
  const title = S(o.title).trim();
  if (!title) return null;
  const createdAt = N(o.createdAt, Date.now());
  return {
    id: S(o.id) || idFallback,
    title,
    link: S(o.link),
    createdAt,
    updatedAt: N(o.updatedAt, createdAt),
    ver: N(o.ver, 1),
    labels: labelsOf(o.labels),
    status: S(o.status) === "draft" ? "draft" : "published",
    author: S(o.author) || "F4KUYY",
    excerpt: S(o.excerpt),
    readMin: Math.max(1, N(o.readMin, 1)),
    hasCover: o.hasCover === true || S(o.hasCover) === "1",
    thumb: S(o.thumb)
  };
}
function normFull(raw: unknown, id: string): PostFull | null {
  const card = normCard(raw, id);
  if (!card) return null;
  const o = (typeof raw === "object" && raw ? raw : json<Record<string, unknown>>(raw)) as Record<string, unknown>;
  return { ...card, id: card.id || id, body: S(o.body) };
}
const strip = (p: PostFull): PostCard => { const { body, ...c } = p; void body; return c; };
const byNewest = (a: PostCard, b: PostCard) => b.createdAt - a.createdAt;

/* ---------- mode demo ---------- */
type Mem = {
  posts: Map<string, PostFull>; imgs: Map<string, string>;
  likes: Map<string, Set<string>>; comments: Map<string, StoredComment[]>;
  kv: Map<string, string>; rl: Map<string, { n: number; exp: number }>; seeded: boolean;
};
const g = globalThis as unknown as { __pxmem?: Mem };

function svgCover(a: string, b: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="1200" height="900" fill="url(#g)"/><circle cx="960" cy="170" r="230" fill="#fff" opacity=".18"/><circle cx="210" cy="740" r="310" fill="#000" opacity=".1"/><circle cx="600" cy="450" r="150" fill="#fff" opacity=".22"/><text x="600" y="472" font-family="Arial" font-size="60" font-weight="bold" fill="#fff" text-anchor="middle" opacity=".92">F4KUYY</text></svg>`;
  return Buffer.from(svg).toString("base64");
}
function svgThumb(a: string, b: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="18"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="24" height="18" fill="url(#g)"/></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
function seedDemo(m: Mem) {
  m.seeded = true;
  const base = Date.now() - 3600_000 * 6;
  const rows: Array<{ id: string; title: string; link: string; body: string; labels: string[]; ts: number; cover?: [string, string]; status: PostStatus }> = [
    { id: "demo-ai", title: "Menjelajahi AI: Bagaimana Kecerdasan Buatan Mengubah Cara Kita Bekerja dan Hidup", link: "https://blog.google/technology/ai/", labels: ["AI", "Masa Depan", "Produktivitas"], ts: base, cover: ["#4285F4", "#A142F4"], status: "published", body: `<p>Kecerdasan buatan bukan lagi cerita fiksi ilmiah. Ia ada di keyboard yang kita pakai, di rekomendasi tontonan, sampai di cara tim kecil menyelesaikan pekerjaan yang dulu butuh satu divisi penuh.</p><h2>AI di pekerjaan sehari-hari</h2><p>Yang berubah bukan cuma kecepatan, tapi bentuk pekerjaannya. Menyusun draf, merangkum rapat, membersihkan data — semua bisa dimulai dari satu perintah singkat, lalu manusia yang menyempurnakannya.</p><ul><li><b>Asisten riset:</b> merangkum dokumen panjang jadi poin yang bisa dipakai.</li><li><b>Asisten menulis:</b> memberi draf awal, bukan hasil akhir.</li></ul><h2>Risiko yang perlu dijaga</h2><p>Privasi data, pergeseran lapangan kerja, dan bias algoritma adalah tiga hal yang harus dijaga ketat.</p><blockquote>Teknologi sebaiknya memperluas kemampuan manusia, bukan menggantikan penilaian manusia.</blockquote>` },
    { id: "demo-material", title: "Material You: warna yang lahir dari kamu", link: "https://m3.material.io/", labels: ["Desain", "Material You"], ts: base - 3600_000 * 20, cover: ["#34A853", "#24C1E0"], status: "published", body: `<p>Material You lahir dari ide sederhana: antarmuka seharusnya terasa milikmu. Satu warna dasar diturunkan menjadi palet terang dan gelap yang konsisten.</p><h2>Dari satu seed ke seluruh sistem</h2><p>Palet tonal memberi tangga nada 0 sampai 100. Primary memakai tone 40 di mode terang dan 80 di mode gelap.</p><p>Spesifikasi lengkapnya ada di <a href="https://m3.material.io/">Material Design 3</a>.</p>` },
    { id: "demo-pixel", title: "Pixel Feature Drop: hal kecil yang bikin senang", link: "", labels: ["Pixel", "Tips"], ts: base - 3600_000 * 46, status: "published", body: `<p>Feature Drop adalah cara Pixel mendapat kemampuan baru tanpa menunggu ganti perangkat.</p><h2>Yang paling terasa</h2><p>Perbaikan kamera biasanya datang diam-diam, tapi hasilnya kelihatan di foto malam hari.</p>` },
    { id: "demo-draf", title: "Draf: catatan tentang menulis lebih singkat", link: "", labels: ["Catatan"], ts: base - 3600_000 * 2, status: "draft", body: "<p>Ini draf. Hanya terlihat di panel admin sampai dipublikasikan.</p>" }
  ];
  for (const r of rows) {
    const text = htmlToText(r.body);
    m.posts.set(r.id, {
      id: r.id, title: r.title, link: r.link, body: r.body, createdAt: r.ts, updatedAt: r.ts, ver: 1,
      labels: r.labels, status: r.status, author: "F4KUYY", excerpt: makeExcerpt(text),
      readMin: readingMinutes(text), hasCover: !!r.cover, thumb: r.cover ? svgThumb(r.cover[0], r.cover[1]) : ""
    });
    if (r.cover) m.imgs.set(r.id, svgCover(r.cover[0], r.cover[1]));
    m.likes.set(r.id, new Set());
    m.comments.set(r.id, []);
  }
  m.comments.set("demo-ai", [
    { id: "c1demoai", name: "Maya", text: "Bagian bias algoritma itu penting banget. Terima kasih sudah menulisnya jelas.", ts: base - 3600_000 * 3, vid: "demo" },
    { id: "c2demoai", name: "Raka", text: "Aku pakai AI buat draf, tapi tetap kuedit sendiri. Rasanya lebih cepat.", ts: base - 3600_000, vid: "demo" }
  ]);
}
function mem(): Mem {
  if (!g.__pxmem) g.__pxmem = { posts: new Map(), imgs: new Map(), likes: new Map(), comments: new Map(), kv: new Map(), rl: new Map(), seeded: false };
  if (!g.__pxmem.seeded) seedDemo(g.__pxmem);
  return g.__pxmem;
}

/* ---------- indeks ---------- */
async function scanKeys(pattern: string): Promise<string[]> {
  if (!redis) return [];
  const out: string[] = [];
  try {
    let cursor = "0";
    for (let i = 0; i < 25; i++) {
      const r = (await redis.scan(cursor, { match: pattern, count: 200 })) as [string, string[]];
      const next = S(r?.[0]);
      (r?.[1] ?? []).forEach((k) => out.push(String(k)));
      if (!next || next === "0") break;
      cursor = next;
    }
  } catch { /* fallback */ }
  if (!out.length) {
    try { ((await redis.keys(pattern)) as unknown[]).forEach((k) => out.push(String(k))); } catch { /* abaikan */ }
  }
  return [...new Set(out)];
}

async function collectAll(): Promise<PostFull[]> {
  if (!redis) return [...mem().posts.values()];
  const ids = new Set<string>();
  try { ((await redis.zrange(ZSET, 0, -1)) as unknown[]).forEach((x) => ids.add(String(x))); } catch { /* abaikan */ }
  for (const k of await scanKeys("px:post:*")) ids.add(k.slice("px:post:".length));
  for (const k of await scanKeys("post:*")) {
    const id = k.slice("post:".length);
    if (id && !id.includes(":")) ids.add(id);
  }
  const list = await Promise.all([...ids].map((id) => readFull(id)));
  return list.filter((p): p is PostFull => !!p);
}

async function writeIndex(cards: PostCard[]): Promise<void> {
  if (!redis) return;
  const clean = cards.filter((c) => c && c.id && c.title).sort(byNewest);
  const payload = JSON.stringify(clean);
  for (let attempt = 0; attempt < 2; attempt++) {
    await redis.set(INDEX, payload);
    const back = json<PostCard[]>(await redis.get(INDEX));
    if (Array.isArray(back) && back.length === clean.length && clean.every((c) => back.some((b) => b?.id === c.id))) return;
  }
  throw new Error("Database menolak menyimpan daftar postingan. Periksa koneksi Upstash di Vercel, lalu Redeploy.");
}

/** Indeks tidak lagi dipercaya buta: dibandingkan dengan jumlah di zset. */
async function readIndex(): Promise<PostCard[]> {
  if (!redis) return [...mem().posts.values()].map(strip).sort(byNewest);
  const [rawIdx, zCount] = await Promise.all([
    redis.get(INDEX).catch(() => null),
    redis.zcard(ZSET).catch(() => 0)
  ]);
  const idx = json<PostCard[]>(rawIdx);
  const cards = (Array.isArray(idx) ? idx : []).map((c) => normCard(c)).filter((c): c is PostCard => !!c);
  if (cards.length && cards.length >= N(zCount)) return cards.sort(byNewest);
  const all = await collectAll();
  const rebuilt = all.map(strip).sort(byNewest);
  if (rebuilt.length) {
    await writeIndex(rebuilt).catch(() => {});
    return rebuilt;
  }
  return cards.sort(byNewest);
}

export async function repairIndex(): Promise<{ ditemukan: number; tersimpan: number }> {
  if (!redis) return { ditemukan: mem().posts.size, tersimpan: mem().posts.size };
  const all = await collectAll();
  const cards = all.map(strip).sort(byNewest);
  await writeIndex(cards);
  for (const p of all) {
    await redis.zadd(ZSET, { score: p.createdAt, member: p.id }).catch(() => {});
    await redis.set(PKEY(p.id), JSON.stringify(p)).catch(() => {});
  }
  return { ditemukan: all.length, tersimpan: cards.length };
}

/* ---------- baca ---------- */
async function readFull(id: string): Promise<PostFull | null> {
  if (!redis) return mem().posts.get(id) ?? null;
  const modern = normFull(await redis.get(PKEY(id)).catch(() => null), id);
  if (modern) return modern;
  const legacy = normFull(await redis.hgetall(LKEY(id)).catch(() => null), id);
  if (legacy) {
    await redis.set(PKEY(id), JSON.stringify(legacy)).catch(() => {});
    return legacy;
  }
  const idx = json<PostCard[]>(await redis.get(INDEX).catch(() => null));
  const card = Array.isArray(idx) ? idx.find((c) => c?.id === id) : null;
  const norm = card ? normCard(card, id) : null;
  return norm ? { ...norm, body: "" } : null;
}

export async function listCards(includeDrafts = false): Promise<PostCard[]> {
  const cards = await readIndex();
  return includeDrafts ? cards : cards.filter((c) => c.status === "published");
}
export async function getFull(id: string): Promise<PostFull | null> { return readFull(id); }
export const getPost = getFull;

export async function getImg(id: string): Promise<string | null> {
  if (redis) { const v = await redis.get(IKEY(id)).catch(() => null); return v == null ? null : String(v); }
  return mem().imgs.get(id) ?? null;
}

export async function likeCount(id: string): Promise<number> {
  if (redis) return N(await redis.scard(`likes:${id}`).catch(() => 0));
  return mem().likes.get(id)?.size ?? 0;
}
export async function commentCount(id: string): Promise<number> {
  if (redis) return N(await redis.llen(`comments:${id}`).catch(() => 0));
  return mem().comments.get(id)?.length ?? 0;
}
export async function isLiked(id: string, vid: string): Promise<boolean> {
  if (redis) return N(await redis.sismember(`likes:${id}`, vid).catch(() => 0)) === 1;
  return mem().likes.get(id)?.has(vid) ?? false;
}
export async function getStats(id: string, vid?: string): Promise<{ likes: number; comments: number; liked: boolean }> {
  const [likes, comments, liked] = await Promise.all([
    likeCount(id), commentCount(id), vid ? isLiked(id, vid) : Promise.resolve(false)
  ]);
  return { likes, comments, liked };
}
export async function getFeed(vid?: string): Promise<PostWithStats[]> {
  const cards = await listCards(false);
  const stats = await Promise.all(cards.map((c) => getStats(c.id, vid)));
  return cards.map((c, i) => ({ ...c, ...stats[i] }));
}
export async function getArticle(id: string, vid?: string) {
  const post = await readFull(id);
  if (!post) return null;
  const [stats, comments] = await Promise.all([getStats(id, vid), getComments(id)]);
  return { post, stats, comments };
}
export async function getNeighbors(id: string): Promise<{ newer: PostCard | null; older: PostCard | null }> {
  const cards = await listCards(false);
  const i = cards.findIndex((c) => c.id === id);
  if (i < 0) return { newer: null, older: null };
  return { newer: i > 0 ? cards[i - 1] : null, older: i < cards.length - 1 ? cards[i + 1] : null };
}
export async function adminList(): Promise<Array<PostCard & { likes: number; comments: number; commentsList: Comment[] }>> {
  const cards = await listCards(true);
  return Promise.all(cards.map(async (c) => ({
    ...c, likes: await likeCount(c.id), comments: await commentCount(c.id), commentsList: await getComments(c.id)
  })));
}

/* ---------- tulis ---------- */
function buildPost(input: PostInput, id: string, prev?: PostFull | null): PostFull {
  const body = input.body ?? prev?.body ?? "";
  const text = htmlToText(body);
  const now = Date.now();
  const hasCover = input.cover === undefined ? !!prev?.hasCover : !!input.cover;
  return {
    id,
    title: input.title ?? prev?.title ?? "",
    link: input.link ?? prev?.link ?? "",
    body,
    createdAt: prev?.createdAt ?? now,
    updatedAt: now,
    ver: (prev?.ver ?? 0) + 1,
    labels: input.labels ?? prev?.labels ?? [],
    status: input.status ?? prev?.status ?? "published",
    author: input.author ?? prev?.author ?? "F4KUYY",
    excerpt: makeExcerpt(text),
    readMin: readingMinutes(text),
    hasCover,
    thumb: input.cover === undefined ? prev?.thumb ?? "" : input.cover?.thumb ?? ""
  };
}

export async function createPost(input: PostInput): Promise<PostFull> {
  const id = uid(12);
  const post = buildPost(input, id);
  if (!redis) {
    const m = mem();
    m.posts.set(id, post);
    if (input.cover) m.imgs.set(id, input.cover.b64);
    m.likes.set(id, new Set());
    m.comments.set(id, []);
    return post;
  }
  if (input.cover) await redis.set(IKEY(id), input.cover.b64);
  await redis.set(PKEY(id), JSON.stringify(post));
  const back = normFull(await redis.get(PKEY(id)).catch(() => null), id);
  if (!back || back.title !== post.title) {
    throw new Error("Database tidak menyimpan postingan (uji baca-ulang gagal). Periksa env Upstash di Vercel lalu Redeploy.");
  }
  await redis.zadd(ZSET, { score: post.createdAt, member: id }).catch(() => {});
  const cards = await readIndex();
  await writeIndex([strip(post), ...cards.filter((c) => c.id !== id)]);
  return post;
}

export async function updatePost(id: string, patch: Partial<PostInput>): Promise<PostFull | null> {
  const prev = await readFull(id);
  if (!prev) return null;
  const post = buildPost({
    ...patch,
    title: patch.title ?? prev.title, link: patch.link ?? prev.link, body: patch.body ?? prev.body,
    labels: patch.labels ?? prev.labels, status: patch.status ?? prev.status,
    author: patch.author ?? prev.author, cover: patch.cover
  }, id, prev);
  if (!redis) {
    const m = mem();
    m.posts.set(id, post);
    if (patch.cover) m.imgs.set(id, patch.cover.b64);
    if (patch.cover === null) m.imgs.delete(id);
    return post;
  }
  if (patch.cover) await redis.set(IKEY(id), patch.cover.b64);
  if (patch.cover === null) await redis.del(IKEY(id));
  await redis.set(PKEY(id), JSON.stringify(post));
  const back = normFull(await redis.get(PKEY(id)).catch(() => null), id);
  if (!back || back.ver !== post.ver) throw new Error("Database tidak menyimpan perubahan. Periksa koneksi Upstash.");
  await redis.zadd(ZSET, { score: post.createdAt, member: id }).catch(() => {});
  const cards = await readIndex();
  await writeIndex([strip(post), ...cards.filter((c) => c.id !== id)]);
  return post;
}

export async function deletePost(id: string): Promise<void> {
  if (!redis) {
    const m = mem();
    m.posts.delete(id); m.imgs.delete(id); m.likes.delete(id); m.comments.delete(id);
    return;
  }
  await redis.del(PKEY(id));
  await redis.del(LKEY(id));
  await redis.del(IKEY(id));
  await redis.del(`likes:${id}`);
  await redis.del(`comments:${id}`);
  await redis.zrem(ZSET, id).catch(() => {});
  const cards = await readIndex();
  await writeIndex(cards.filter((c) => c.id !== id));
}

export async function putMedia(b64: string): Promise<string> {
  const id = "m" + uid(11);
  if (redis) await redis.set(IKEY(id), b64);
  else mem().imgs.set(id, b64);
  return id;
}

/* ---------- like & komentar ---------- */
export async function toggleLike(id: string, vid: string): Promise<{ liked: boolean; count: number }> {
  if (redis) {
    const key = `likes:${id}`;
    const has = N(await redis.sismember(key, vid)) === 1;
    if (has) await redis.srem(key, vid); else await redis.sadd(key, vid);
    return { liked: !has, count: N(await redis.scard(key)) };
  }
  const m = mem();
  if (!m.likes.has(id)) m.likes.set(id, new Set());
  const set = m.likes.get(id)!;
  const has = set.has(vid);
  if (has) set.delete(vid); else set.add(vid);
  return { liked: !has, count: set.size };
}

function parseComment(x: unknown): StoredComment | null {
  const o = typeof x === "string" ? json<StoredComment>(x) : (x as StoredComment | null);
  return o && o.id && o.text != null ? o : null;
}
const pub = (c: StoredComment): Comment => ({ id: c.id, name: c.name, text: c.text, ts: c.ts });

export async function getComments(id: string): Promise<Comment[]> {
  if (redis) {
    const arr = (await redis.lrange(`comments:${id}`, 0, -1).catch(() => [])) as unknown[];
    return arr.map(parseComment).filter((c): c is StoredComment => !!c).map(pub);
  }
  return (mem().comments.get(id) ?? []).map(pub);
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

/* ---------- KV & rate limit ---------- */
export async function kvGet(key: string): Promise<string | null> {
  if (redis) { const v = await redis.get(key).catch(() => null); return v == null ? null : String(v); }
  return mem().kv.get(key) ?? null;
}
export async function kvSet(key: string, val: string): Promise<void> {
  if (redis) { await redis.set(key, val); return; }
  mem().kv.set(key, val);
}
export async function rlCount(key: string): Promise<number> {
  if (redis) return N(await redis.get(key).catch(() => 0));
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

/* ---------- diagnosa ---------- */
export async function dbInfo(probe = true) {
  const envTerbaca = process.env.UPSTASH_REDIS_REST_URL ? "UPSTASH_REDIS_REST_*" : process.env.KV_REST_API_URL ? "KV_REST_API_*" : "tidak ada";
  const base = {
    build: BUILD,
    demo: !dbReady,
    envTerbaca,
    urlAda: !!url,
    tokenAda: !!token,
    pesan: dbReady
      ? "Database tersambung."
      : "MODE DEMO: Upstash belum tersambung. Postingan hanya di memori dan akan hilang. Sambungkan Upstash di Vercel lalu Redeploy."
  };
  if (!redis) {
    return { ...base, ujiTulis: "dilewati (demo)", indeks: mem().posts.size, zset: 0, ditemukan: mem().posts.size, terbaca: mem().posts.size, perluPerbaiki: false, ids: [...mem().posts.keys()] };
  }
  let ujiTulis = "tidak diuji";
  if (probe) {
    const k = `probe:${uid(6)}`;
    try {
      await redis.set(k, "ok", { ex: 30 });
      const back = await redis.get(k);
      await redis.del(k);
      ujiTulis = String(back) === "ok" ? "berhasil" : "gagal (nilai tidak kembali)";
    } catch (e) { ujiTulis = "gagal: " + (e instanceof Error ? e.message : String(e)); }
  }
  const idxRaw = json<PostCard[]>(await redis.get(INDEX).catch(() => null));
  const indeks = Array.isArray(idxRaw) ? idxRaw.length : 0;
  const zset = N(await redis.zcard(ZSET).catch(() => 0));
  const all = await collectAll();
  const terbaca = (await listCards(true).catch(() => [])).length;
  return {
    ...base, ujiTulis, indeks, zset, ditemukan: all.length, terbaca,
    perluPerbaiki: all.length > terbaca,
    ids: all.map((p) => p.id).slice(0, 20),
    contoh: all[0] ? { id: all[0].id, judul: all[0].title, status: all[0].status, panjangBody: all[0].body.length } : null
  };
}

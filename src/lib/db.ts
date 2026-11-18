import { Redis } from "@upstash/redis";
import { htmlToText, makeExcerpt, readingMinutes, uid } from "./utils";

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

const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
export const redis = url && token ? new Redis({ url, token }) : null;
export const dbReady = !!redis;

const FIELDS = ["title", "link", "createdAt", "updatedAt", "ver", "labels", "status", "author", "excerpt", "readMin", "hasCover", "thumb", "body"] as const;

/* ---------- memori (mode demo) ---------- */
type Mem = {
  posts: Map<string, PostFull>;
  imgs: Map<string, string>;
  likes: Map<string, Set<string>>;
  comments: Map<string, StoredComment[]>;
  kv: Map<string, string>;
  rl: Map<string, { n: number; exp: number }>;
  seeded: boolean;
};
const g = globalThis as unknown as { __pxmem?: Mem };

function svgCover(a: string, b: string, label: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="1200" height="900" fill="url(#g)"/><circle cx="960" cy="170" r="230" fill="#fff" opacity=".18"/><circle cx="210" cy="740" r="310" fill="#000" opacity=".10"/><circle cx="600" cy="450" r="150" fill="#fff" opacity=".22"/><text x="600" y="472" font-family="Arial" font-size="60" font-weight="bold" fill="#fff" text-anchor="middle" opacity=".92">${label}</text></svg>`;
  return Buffer.from(svg).toString("base64");
}
function svgThumb(a: string, b: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="18"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="24" height="18" fill="url(#g)"/></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

function seedDemo(m: Mem) {
  m.seeded = true;
  const base = 1762900000000;
  const rows: Array<{ id: string; title: string; link: string; body: string; labels: string[]; ts: number; cover?: [string, string]; status: PostStatus }> = [
    {
      id: "demo-ai", title: "Menjelajahi AI: Bagaimana Kecerdasan Buatan Mengubah Cara Kita Bekerja dan Hidup",
      link: "https://blog.google/technology/ai/", labels: ["AI", "Masa Depan", "Produktivitas"], ts: base,
      cover: ["#4285F4", "#A142F4"], status: "published",
      body: `<p>Kecerdasan buatan bukan lagi cerita fiksi ilmiah. Ia ada di keyboard yang kita pakai, di rekomendasi tontonan, sampai di cara tim kecil menyelesaikan pekerjaan yang dulu butuh satu divisi penuh.</p><h2>AI di pekerjaan sehari-hari</h2><p>Yang berubah bukan cuma kecepatan, tapi bentuk pekerjaannya. Menyusun draf, merangkum rapat, membersihkan data — semua bisa dimulai dari satu perintah singkat, lalu manusia yang menyempurnakannya.</p><ul><li><b>Asisten riset:</b> merangkum dokumen panjang jadi poin yang bisa dipakai.</li><li><b>Asisten menulis:</b> memberi draf awal, bukan hasil akhir.</li></ul><h2>Risiko yang perlu dijaga</h2><p>Privasi data, pergeseran lapangan kerja, dan bias algoritma adalah tiga hal yang harus dijaga ketat.</p><blockquote>Teknologi sebaiknya memperluas kemampuan manusia, bukan menggantikan penilaian manusia.</blockquote>`
    },
    {
      id: "demo-material", title: "Material You: warna yang lahir dari kamu",
      link: "https://m3.material.io/", labels: ["Desain", "Material You"], ts: base - 3600_000 * 20,
      cover: ["#34A853", "#24C1E0"], status: "published",
      body: `<p>Material You lahir dari ide sederhana: antarmuka seharusnya terasa milikmu. Warna diambil dari satu warna dasar, lalu diturunkan menjadi palet terang dan gelap yang konsisten.</p><h2>Dari satu seed ke seluruh sistem</h2><p>Palet tonal memberi tangga nada dari 0 sampai 100. Primary memakai tone 40 di mode terang dan 80 di mode gelap.</p><p>Spesifikasi lengkapnya ada di <a href="https://m3.material.io/">Material Design 3</a>.</p>`
    },
    {
      id: "demo-pixel", title: "Pixel Feature Drop: hal kecil yang bikin senang",
      link: "", labels: ["Pixel", "Tips"], ts: base - 3600_000 * 46, status: "published",
      body: `<p>Feature Drop adalah cara Pixel mendapat kemampuan baru tanpa menunggu ganti perangkat. Hal-hal kecil yang justru paling sering dipakai.</p><h2>Yang paling terasa</h2><p>Perbaikan kamera biasanya datang diam-diam, tapi hasilnya kelihatan di foto malam hari.</p>`
    },
    {
      id: "demo-draf", title: "Draf: catatan tentang menulis lebih singkat",
      link: "", labels: ["Catatan"], ts: base - 3600_000 * 4, status: "draft",
      body: "<p>Ini draf. Hanya terlihat di panel admin sampai dipublikasikan.</p>"
    }
  ];
  for (const r of rows) {
    const text = htmlToText(r.body);
    const post: PostFull = {
      id: r.id, title: r.title, link: r.link, body: r.body, createdAt: r.ts, updatedAt: r.ts, ver: 1,
      labels: r.labels, status: r.status, author: "F4KUYY", excerpt: makeExcerpt(text),
      readMin: readingMinutes(text), hasCover: !!r.cover, thumb: r.cover ? svgThumb(r.cover[0], r.cover[1]) : ""
    };
    m.posts.set(r.id, post);
    if (r.cover) m.imgs.set(r.id, svgCover(r.cover[0], r.cover[1], "F4KUYY"));
    m.likes.set(r.id, new Set());
    m.comments.set(r.id, []);
  }
  m.comments.set("demo-ai", [
    { id: "c1demoai", name: "Maya", text: "Bagian bias algoritma itu penting banget. Terima kasih sudah menulisnya jelas.", ts: base - 3600_000 * 5, vid: "demo" },
    { id: "c2demoai", name: "Raka", text: "Aku pakai AI buat draf, tapi tetap kuedit sendiri. Rasanya lebih cepat.", ts: base - 3600_000 * 2, vid: "demo" }
  ]);
}

function mem(): Mem {
  if (!g.__pxmem) {
    g.__pxmem = { posts: new Map(), imgs: new Map(), likes: new Map(), comments: new Map(), kv: new Map(), rl: new Map(), seeded: false };
  }
  if (!g.__pxmem.seeded) seedDemo(g.__pxmem);
  return g.__pxmem;
}

/* ---------- koersi (tahan terhadap bentuk objek maupun array) ---------- */
const S = (v: unknown) => (v == null ? "" : String(v));
const N = (v: unknown, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };

function asRecord(raw: unknown): Record<string, unknown> | null {
  if (!raw) return null;
  if (Array.isArray(raw)) {
    const o: Record<string, unknown> = {};
    FIELDS.forEach((f, i) => { o[f] = raw[i]; });
    return o;
  }
  if (typeof raw === "object") return raw as Record<string, unknown>;
  return null;
}
function labelsOf(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String).slice(0, 5);
  try { const p = JSON.parse(S(v) || "[]"); return Array.isArray(p) ? p.map(String).slice(0, 5) : []; } catch { return []; }
}
function fullFrom(id: string, raw: unknown): PostFull | null {
  const h = asRecord(raw);
  if (!h || h.title == null || S(h.title) === "") return null;
  return {
    id, title: S(h.title), link: S(h.link), body: S(h.body), createdAt: N(h.createdAt),
    updatedAt: N(h.updatedAt, N(h.createdAt)), ver: N(h.ver, 1), labels: labelsOf(h.labels),
    status: S(h.status) === "draft" ? "draft" : "published", author: S(h.author) || "F4KUYY",
    excerpt: S(h.excerpt), readMin: N(h.readMin, 1),
    hasCover: S(h.hasCover) === "1" || h.hasCover === true, thumb: S(h.thumb)
  };
}
const strip = (p: PostFull): PostCard => { const { body, ...card } = p; void body; return card; };

function hashOf(p: PostFull): Record<string, string> {
  return {
    title: p.title, link: p.link, body: p.body,
    createdAt: String(p.createdAt), updatedAt: String(p.updatedAt), ver: String(p.ver),
    labels: JSON.stringify(p.labels), status: p.status, author: p.author, excerpt: p.excerpt,
    readMin: String(p.readMin), hasCover: p.hasCover ? "1" : "0", thumb: p.thumb
  };
}

/* ---------- daftar & baca (TANPA cache antar-mesin) ---------- */
export async function listCards(includeDrafts = false): Promise<PostCard[]> {
  let cards: PostCard[];
  if (redis) {
    const ids = ((await redis.zrange("posts", 0, -1, { rev: true })) as unknown[]).map(String);
    if (!ids.length) return [];
    const raws = await Promise.all(ids.map((id) => redis!.hgetall(`post:${id}`).catch(() => null)));
    cards = ids.map((id, i) => fullFrom(id, raws[i])).filter((p): p is PostFull => !!p).map(strip);
  } else {
    cards = [...mem().posts.values()].sort((a, b) => b.createdAt - a.createdAt).map(strip);
  }
  return includeDrafts ? cards : cards.filter((c) => c.status === "published");
}

export async function getFull(id: string): Promise<PostFull | null> {
  if (redis) return fullFrom(id, await redis.hgetall(`post:${id}`).catch(() => null));
  return mem().posts.get(id) ?? null;
}
export const getPost = getFull;

export async function getImg(id: string): Promise<string | null> {
  if (redis) { const v = await redis.get(`img:${id}`).catch(() => null); return v == null ? null : String(v); }
  return mem().imgs.get(id) ?? null;
}

export async function getStats(id: string, vid?: string): Promise<{ likes: number; comments: number; liked: boolean }> {
  if (redis) {
    const [likes, comments, liked] = await Promise.all([
      redis.scard(`likes:${id}`).catch(() => 0),
      redis.llen(`comments:${id}`).catch(() => 0),
      vid ? redis.sismember(`likes:${id}`, vid).catch(() => 0) : Promise.resolve(0)
    ]);
    return { likes: N(likes), comments: N(comments), liked: N(liked) === 1 };
  }
  const m = mem();
  return { likes: m.likes.get(id)?.size ?? 0, comments: m.comments.get(id)?.length ?? 0, liked: vid ? !!m.likes.get(id)?.has(vid) : false };
}

export async function getFeed(vid?: string): Promise<PostWithStats[]> {
  const cards = await listCards(false);
  const stats = await Promise.all(cards.map((c) => getStats(c.id, vid)));
  return cards.map((c, i) => ({ ...c, ...stats[i] }));
}

export async function getArticle(id: string, vid?: string): Promise<{ post: PostFull; stats: { likes: number; comments: number; liked: boolean }; comments: Comment[] } | null> {
  const post = await getFull(id);
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
    ...c,
    likes: await likeCount(c.id),
    comments: await commentCount(c.id),
    commentsList: await getComments(c.id)
  })));
}

/* ---------- tulis: berurutan + verifikasi baca-ulang ---------- */
export type PostInput = { title: string; link: string; body: string; labels: string[]; status: PostStatus; author: string; cover?: Cover | null };

export async function createPost(input: PostInput): Promise<PostFull> {
  const id = uid(12);
  const text = htmlToText(input.body);
  const now = Date.now();
  const post: PostFull = {
    id, title: input.title, link: input.link, body: input.body, createdAt: now, updatedAt: now, ver: 1,
    labels: input.labels, status: input.status, author: input.author, excerpt: makeExcerpt(text),
    readMin: readingMinutes(text), hasCover: !!input.cover, thumb: input.cover?.thumb ?? ""
  };
  if (redis) {
    if (input.cover) await redis.set(`img:${id}`, input.cover.b64);
    await redis.hset(`post:${id}`, hashOf(post));
    await redis.zadd("posts", { score: now, member: id });
    const check = fullFrom(id, await redis.hgetall(`post:${id}`).catch(() => null));
    const rank = await redis.zscore("posts", id).catch(() => null);
    if (!check || rank == null) {
      throw new Error("Database menolak penyimpanan. Periksa koneksi Upstash di Vercel.");
    }
  } else {
    const m = mem();
    m.posts.set(id, post);
    if (input.cover) m.imgs.set(id, input.cover.b64);
    m.likes.set(id, new Set());
    m.comments.set(id, []);
  }
  return post;
}

export async function updatePost(id: string, patch: Partial<PostInput>): Promise<PostFull | null> {
  const cur = await getFull(id);
  if (!cur) return null;
  const body = patch.body ?? cur.body;
  const text = htmlToText(body);
  const hasCover = patch.cover === undefined ? cur.hasCover : !!patch.cover;
  const next: PostFull = {
    ...cur,
    title: patch.title ?? cur.title,
    link: patch.link ?? cur.link,
    body,
    labels: patch.labels ?? cur.labels,
    status: patch.status ?? cur.status,
    author: patch.author ?? cur.author,
    excerpt: makeExcerpt(text),
    readMin: readingMinutes(text),
    hasCover,
    thumb: patch.cover === undefined ? cur.thumb : patch.cover?.thumb ?? "",
    updatedAt: Date.now(),
    ver: cur.ver + 1
  };
  if (redis) {
    if (patch.cover) await redis.set(`img:${id}`, patch.cover.b64);
    if (patch.cover === null) await redis.del(`img:${id}`);
    await redis.hset(`post:${id}`, hashOf(next));
    await redis.zadd("posts", { score: next.createdAt, member: id });
    const check = fullFrom(id, await redis.hgetall(`post:${id}`).catch(() => null));
    if (!check) throw new Error("Database menolak perubahan. Periksa koneksi Upstash.");
  } else {
    const m = mem();
    m.posts.set(id, next);
    if (patch.cover) m.imgs.set(id, patch.cover.b64);
    if (patch.cover === null) m.imgs.delete(id);
  }
  return next;
}

export async function deletePost(id: string): Promise<void> {
  if (redis) {
    await redis.zrem("posts", id);
    await redis.del(`post:${id}`);
    await redis.del(`img:${id}`);
    await redis.del(`likes:${id}`);
    await redis.del(`comments:${id}`);
  } else {
    const m = mem();
    m.posts.delete(id); m.imgs.delete(id); m.likes.delete(id); m.comments.delete(id);
  }
}

export async function putMedia(b64: string): Promise<string> {
  const id = "m" + uid(11);
  if (redis) await redis.set(`img:${id}`, b64);
  else mem().imgs.set(id, b64);
  return id;
}

/* ---------- like ---------- */
export async function likeCount(id: string): Promise<number> {
  if (redis) return N(await redis.scard(`likes:${id}`).catch(() => 0));
  return mem().likes.get(id)?.size ?? 0;
}
export async function isLiked(id: string, vid: string): Promise<boolean> {
  if (redis) return N(await redis.sismember(`likes:${id}`, vid).catch(() => 0)) === 1;
  return mem().likes.get(id)?.has(vid) ?? false;
}
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

/* ---------- komentar ---------- */
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
    const arr = (await redis.lrange(`comments:${id}`, 0, -1).catch(() => [])) as unknown[];
    return arr.map(parseComment).filter((c): c is StoredComment => !!c).map(pub);
  }
  return (mem().comments.get(id) ?? []).map(pub);
}
export async function commentCount(id: string): Promise<number> {
  if (redis) return N(await redis.llen(`comments:${id}`).catch(() => 0));
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

/* ---------- KV & rate limit ---------- */
export async function kvGet(key: string): Promise<string | null> {
  if (redis) { const v = await redis.get(key); return v == null ? null : String(v); }
  return mem().kv.get(key) ?? null;
}
export async function kvSet(key: string, val: string): Promise<void> {
  if (redis) { await redis.set(key, val); return; }
  mem().kv.set(key, val);
}
export async function rlCount(key: string): Promise<number> {
  if (redis) return N(await redis.get(key));
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
export async function dbInfo() {
  const envPair = process.env.UPSTASH_REDIS_REST_URL
    ? "UPSTASH_REDIS_REST_*"
    : process.env.KV_REST_API_URL ? "KV_REST_API_*" : "tidak ada";
  const base = {
    demo: !dbReady,
    envTerbaca: envPair,
    urlAda: !!url,
    tokenAda: !!token,
    pesan: dbReady
      ? "Database tersambung. Kalau post tetap tidak muncul, kirim hasil ini."
      : "MODE DEMO: database belum tersambung. Post disimpan di memori sementara dan hilang. Sambungkan Upstash di Vercel lalu Redeploy."
  };
  if (!redis) {
    return { ...base, postCount: mem().posts.size, ids: [...mem().posts.keys()], ujiTulis: "dilewati (demo)" };
  }
  let ujiTulis = "gagal";
  const probe = `probe:${uid(6)}`;
  try {
    await redis.set(probe, "ok", { ex: 30 });
    const back = await redis.get(probe);
    await redis.del(probe);
    ujiTulis = String(back) === "ok" ? "berhasil" : "gagal (nilai tidak kembali)";
  } catch (e) {
    ujiTulis = "gagal: " + (e instanceof Error ? e.message : String(e));
  }
  let ids: string[] = [];
  let postCount = 0;
  let contoh: unknown = null;
  try {
    ids = ((await redis.zrange("posts", 0, -1, { rev: true })) as unknown[]).map(String);
    postCount = ids.length;
    if (ids[0]) {
      const h = await redis.hgetall(`post:${ids[0]}`);
      contoh = { id: ids[0], adaHash: !!h, jumlahField: h ? Object.keys(h).length : 0, judul: h ? S((h as Record<string, unknown>).title) : null, status: h ? S((h as Record<string, unknown>).status) : null };
    }
  } catch (e) {
    contoh = "gagal baca: " + (e instanceof Error ? e.message : String(e));
  }
  const terbaca = (await listCards(true).catch(() => [])).length;
  return { ...base, ujiTulis, postCount, ids: ids.slice(0, 20), contoh, jumlahTerbacaOlehAplikasi: terbaca };
}

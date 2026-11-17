export const GOOGLE_COLORS = ["#4285F4", "#EA4335", "#FBBC04", "#34A853"];

export const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));

export function uid(n = 12): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c?.randomUUID) return c.randomUUID().replace(/-/g, "").slice(0, n);
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < n; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** Input sudah di-escape server; URL http/https diubah jadi link biru, newline → <br/>. */
export function commentHtml(escaped: string): string {
  const linked = escaped.replace(/https?:\/\/[^\s<]+/g, (raw) => {
    let m = raw;
    let tail = "";
    while (/[.,;:!?)\]]$/.test(m)) { tail = m.slice(-1) + tail; m = m.slice(0, -1); }
    if (!/^https?:\/\/\S+$/i.test(m)) return raw;
    return `<a class="link" href="${m}" target="_blank" rel="noopener noreferrer nofollow">${m}</a>${tail}`;
  });
  return linked.replace(/\n/g, "<br/>");
}

export function timeAgo(ts: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 45) return "baru saja";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  if (d === 1) return "kemarin";
  if (d < 7) return `${d} hari lalu`;
  return new Date(ts).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

/** Wajib http/https; tanpa skema → otomatis https://. Return null jika tidak valid. */
export function normalizeLink(input: string): string | null {
  let s = (input || "").trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;
  try {
    const u = new URL(s);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (!u.hostname) return null;
    return u.href;
  } catch { return null; }
}

export function hostOf(u: string): string {
  try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; }
}

export function siteUrl(): string {
  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const prev = process.env.VERCEL_URL;
  if (prod) return `https://${prod}`;
  if (prev) return `https://${prev}`;
  return "http://localhost:3000";
}

export function sniffMime(b: Uint8Array): string | null {
  if (b.length < 12) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return "image/gif";
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp";
  let i = 0;
  while (i < b.length && (b[i] === 0x20 || b[i] === 0x0a || b[i] === 0x0d || b[i] === 0x09)) i++;
  if (b[i] === 0x3c) return "image/svg+xml";
  return null;
}

export function reducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

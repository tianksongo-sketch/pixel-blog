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

function safeChar(cp: number): string {
  if (!Number.isFinite(cp) || cp < 0 || cp > 0x10ffff) return "";
  if (cp < 32 && cp !== 9 && cp !== 10) return "";
  try { return String.fromCodePoint(cp); } catch { return ""; }
}

function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]{1,6});/g, (_, h) => safeChar(parseInt(h, 16)))
    .replace(/&#(\d{1,7});/g, (_, d) => safeChar(parseInt(d, 10)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&");
}

/* ---------- Penekanan lembut: *teks* → miring yang memudar ---------- */
const SOFT_OPEN = '<em class="soft-em">';
const SOFT_RE = /(^|[\s\u00A0([{"'—–-])\*([^*\n]{1,400}?)\*(?![\w*])/g;
const STRONG_RE = /(^|[\s\u00A0([{"'—–-])\*\*([^*\n]{1,400}?)\*\*(?![\w*])/g;

/** Untuk potongan teks yang sudah di-escape (tanpa tag). */
export function softenText(escaped: string): string {
  if (!escaped.includes("*")) return escaped;
  let out = escaped.replace(STRONG_RE, (_m, pre: string, inner: string) => `${pre}<strong>${inner}</strong>`);
  out = out.replace(SOFT_RE, (_m, pre: string, inner: string) => `${pre}${SOFT_OPEN}${inner}</em>`);
  return out;
}

/** Untuk HTML utuh: hanya menyentuh node teks, melewati kode & yang sudah diubah. */
export function softenHtml(html: string): string {
  if (!html || !html.includes("*")) return html;
  const parts = html.split(/(<[^>]+>)/g);
  let skip = 0;
  let soft = 0;
  return parts.map((part) => {
    if (!part) return part;
    if (part.startsWith("<")) {
      const tag = /^<\/?\s*([a-zA-Z0-9-]+)/.exec(part)?.[1]?.toLowerCase() ?? "";
      const closing = part.startsWith("</");
      const selfClose = /\/>$/.test(part);
      if (tag === "code" || tag === "pre" || tag === "script" || tag === "style") {
        if (closing) skip = Math.max(0, skip - 1);
        else if (!selfClose) skip += 1;
      }
      if (tag === "em" && /class\s*=\s*["'][^"']*soft-em/.test(part)) {
        if (closing) soft = Math.max(0, soft - 1);
        else soft += 1;
      } else if (tag === "em" && closing && soft > 0) {
        soft = Math.max(0, soft - 1);
      }
      return part;
    }
    if (skip > 0 || soft > 0) return part;
    return softenText(part);
  }).join("");
}

/* ---------- Sanitizer isi artikel ---------- */
const ALLOWED_TAGS = new Set([
  "p", "br", "div", "b", "strong", "i", "em", "u", "s", "strike",
  "h2", "h3", "h4", "ul", "ol", "li", "blockquote", "a", "img",
  "figure", "figcaption", "hr", "code", "pre", "span"
]);
const VOID_TAGS = new Set(["br", "img", "hr"]);
const BAD_BLOCK = /<(script|style|iframe|object|embed|noscript|template|svg|math|form|input|button|textarea|select)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;
const BAD_TAIL = /<(script|style|iframe|object|embed|noscript|template|svg|math|form)\b[\s\S]*$/i;
const ATTR_RE = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'`=<>]+)))?/g;

function parseAttrs(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  ATTR_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ATTR_RE.exec(raw))) {
    const name = m[1].toLowerCase();
    if (name.startsWith("on")) continue;
    out[name] = m[2] ?? m[3] ?? m[4] ?? "";
  }
  return out;
}

function safeUrl(value: string, kind: "a" | "img"): string | null {
  const s = decodeEntities(value).replace(/[\u0000-\u0020\u007F]/g, "");
  if (!s) return null;
  if (kind === "img" && /^\/api\/img\/[a-zA-Z0-9_-]{4,40}(?:\?v=\d{1,15})?$/.test(s)) return s;
  if (/^https?:\/\//i.test(s)) {
    try {
      const u = new URL(s);
      if (u.protocol === "http:" || u.protocol === "https:") return u.href;
    } catch { return null; }
    return null;
  }
  if (kind === "a" && /^mailto:[^<>"']{3,120}$/i.test(s)) return s;
  return null;
}

export function sanitizeBody(input: string, maxLen = 200000): string {
  let src = String(input ?? "").slice(0, maxLen);
  src = src.replace(/<!--[\s\S]*?(?:-->|$)/g, "").replace(BAD_BLOCK, "").replace(BAD_TAIL, "");
  const stack: string[] = [];
  const out: string[] = [];
  const re = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;
  let last = 0;
  let imgs = 0;
  let codeDepth = 0;
  let m: RegExpExecArray | null;
  const text = (t: string) => {
    if (!t) return;
    const esc = escapeHtml(decodeEntities(t));
    out.push(codeDepth > 0 ? esc : softenText(esc));
  };
  const closeTo = (tag: string) => {
    const i = stack.lastIndexOf(tag);
    if (i < 0) return;
    while (stack.length > i) {
      const t = stack.pop()!;
      if (!VOID_TAGS.has(t)) out.push(`</${t}>`);
    }
  };
  while ((m = re.exec(src))) {
    text(src.slice(last, m.index));
    last = m.index + m[0].length;
    const closing = m[1] === "/";
    const tag = m[2].toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) continue;
    if (closing) {
      if ((tag === "code" || tag === "pre") && codeDepth > 0) codeDepth--;
      closeTo(tag);
      continue;
    }
    if (stack.length > 24) continue;
    const at = parseAttrs(m[3] || "");
    if (tag === "img") {
      if (imgs >= 40) continue;
      const url = safeUrl(at.src || "", "img");
      if (!url) continue;
      imgs++;
      const alt = escapeHtml(decodeEntities(at.alt || "").slice(0, 200));
      out.push(`<img src="${escapeHtml(url)}" alt="${alt}" loading="lazy" decoding="async" />`);
      continue;
    }
    if (tag === "a") {
      const href = safeUrl(at.href || "", "a");
      if (!href) continue;
      while (stack.includes("a")) closeTo("a");
      out.push(`<a href="${escapeHtml(href)}" class="link" target="_blank" rel="noopener noreferrer nofollow">`);
      stack.push("a");
      continue;
    }
    if (VOID_TAGS.has(tag)) { out.push(`<${tag} />`); continue; }
    if (tag === "em" || tag === "i") {
      const soft = /(^|\s)soft-em(\s|$)/.test(at.class || "");
      out.push(soft ? SOFT_OPEN : `<${tag}>`);
      stack.push(soft ? "em" : tag);
      continue;
    }
    if (tag === "span") {
      const soft = /(^|\s)soft-em(\s|$)/.test(at.class || "");
      if (!soft) continue;
      out.push(SOFT_OPEN);
      stack.push("em");
      continue;
    }
    if (tag === "code" || tag === "pre") codeDepth++;
    out.push(`<${tag}>`);
    stack.push(tag);
  }
  text(src.slice(last));
  while (stack.length) {
    const t = stack.pop()!;
    if (!VOID_TAGS.has(t)) out.push(`</${t}>`);
  }
  return out.join("");
}

export function htmlToText(html: string): string {
  return String(html ?? "")
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|blockquote|figure|figcaption|pre)>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&#x([0-9a-fA-F]{1,6});/g, (_, h) => safeChar(parseInt(h, 16)))
    .replace(/&#(\d{1,7});/g, (_, d) => safeChar(parseInt(d, 10)))
    .replace(/&nbsp;/gi, " ").replace(/&quot;/gi, '"').replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&amp;/gi, "&")
    .replace(/\*\*([^*\n]+)\*\*/g, "$1")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function bodyIsEmpty(html: string): boolean {
  return htmlToText(html).length === 0 && !/<img\b/i.test(html);
}

export function readingMinutes(text: string): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export function makeExcerpt(text: string, n = 160): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length <= n ? t : t.slice(0, n - 1).trimEnd() + "…";
}

export function formatDate(ts: number): string {
  try {
    return new Date(ts).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  } catch { return ""; }
}

export function parseLabels(input: unknown): string[] {
  const arr = Array.isArray(input) ? input : typeof input === "string" ? input.split(",") : [];
  const out: string[] = [];
  for (const raw of arr) {
    const s = String(raw ?? "").replace(/[\u0000-\u001F\u007F<>"]/g, "").trim().slice(0, 24);
    if (s && !out.some((x) => x.toLowerCase() === s.toLowerCase())) out.push(s);
    if (out.length >= 5) break;
  }
  return out;
}

/* ---------- Komentar ---------- */
export function commentHtml(escaped: string): string {
  const linked = escaped.replace(/https?:\/\/[^\s<]+/g, (raw) => {
    let m = raw;
    let tail = "";
    while (/[.,;:!?)\]]$/.test(m)) { tail = m.slice(-1) + tail; m = m.slice(0, -1); }
    if (!/^https?:\/\/\S+$/i.test(m)) return raw;
    return `<a class="link" href="${m}" target="_blank" rel="noopener noreferrer nofollow">${m}</a>${tail}`;
  });
  return softenText(linked).replace(/\n/g, "<br/>");
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
  return formatDate(ts);
}

/* ---------- Link ---------- */
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

export function optionalLink(input: string): string | null {
  const s = (input || "").trim();
  if (!s) return "";
  return normalizeLink(s);
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

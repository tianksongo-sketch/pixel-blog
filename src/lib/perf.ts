/* ==========================================================================
   perf.ts — deteksi tier performa, scheduler frame tunggal, cache layout
   ========================================================================== */

export type Tier = "lite" | "full";

export type Perf = {
  tier: Tier;
  coarse: boolean;
  calm: boolean;
  cores: number;
  memory: number;
  saveData: boolean;
  dpr: number;
};

let cache: Perf | null = null;

export function perf(): Perf {
  if (cache) return cache;
  if (typeof window === "undefined") {
    cache = { tier: "full", coarse: false, calm: false, cores: 8, memory: 8, saveData: false, dpr: 1 };
    return cache;
  }
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    hardwareConcurrency?: number;
    connection?: { saveData?: boolean; effectiveType?: string };
  };
  const cores = nav.hardwareConcurrency ?? 4;
  const memory = nav.deviceMemory ?? 4;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const saveData = !!nav.connection?.saveData;
  const slowNet = /2g/.test(nav.connection?.effectiveType ?? "");
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const small = window.innerWidth < 1024;
  const weak = cores <= 4 || memory <= 4;
  const lite = coarse || small || weak || saveData || slowNet || (coarse && dpr > 2.5);
  cache = { tier: lite ? "lite" : "full", coarse, calm, cores, memory, saveData, dpr };
  return cache;
}

export function perfCalm(): boolean {
  if (typeof window === "undefined") return true;
  return perf().calm || document.documentElement.dataset.motion === "reduce";
}

type Metrics = { vh: number; vw: number; scrollMax: number; y: number };
const m: Metrics = { vh: 0, vw: 0, scrollMax: 0, y: 0 };
let metricsDirty = true;

export function markMetricsDirty(): void { metricsDirty = true; }

export function metrics(): Metrics {
  if (metricsDirty && typeof window !== "undefined") {
    m.vh = window.innerHeight || 1;
    m.vw = window.innerWidth || 1;
    m.scrollMax = Math.max(0, document.documentElement.scrollHeight - m.vh);
    metricsDirty = false;
  }
  m.y = typeof window !== "undefined" ? window.scrollY : 0;
  return m;
}

type Task = (y: number, mt: Metrics) => void;
const tasks = new Set<Task>();
let raf = 0;
let listening = false;

function frame() {
  raf = 0;
  const mt = metrics();
  tasks.forEach((t) => {
    try { t(mt.y, mt); } catch { /* satu task gagal tidak menghentikan lainnya */ }
  });
}

function schedule() { if (!raf) raf = requestAnimationFrame(frame); }

function onScroll() { schedule(); }
function onResize() { markMetricsDirty(); schedule(); }

export function addFrameTask(t: Task): () => void {
  tasks.add(t);
  if (!listening && typeof window !== "undefined") {
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("orientationchange", onResize, { passive: true });
    listening = true;
  }
  schedule();
  return () => {
    tasks.delete(t);
    if (!tasks.size && listening) {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      listening = false;
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
    }
  };
}

let scrollTimer = 0;
let scrollBound = false;

export function bindScrollState(): () => void {
  if (typeof window === "undefined" || scrollBound) return () => {};
  scrollBound = true;
  const root = document.documentElement;
  const mark = () => {
    if (root.dataset.scrolling !== "1") root.dataset.scrolling = "1";
    window.clearTimeout(scrollTimer);
    scrollTimer = window.setTimeout(() => { root.dataset.scrolling = "0"; }, 140);
  };
  window.addEventListener("scroll", mark, { passive: true });
  return () => {
    window.removeEventListener("scroll", mark);
    window.clearTimeout(scrollTimer);
    root.dataset.scrolling = "0";
    scrollBound = false;
  };
}

export function onVisible(el: Element, cb: (visible: boolean) => void, margin = "120px"): () => void {
  if (typeof IntersectionObserver === "undefined") { cb(true); return () => {}; }
  const io = new IntersectionObserver(([e]) => cb(e.isIntersecting), { rootMargin: margin });
  io.observe(el);
  return () => io.disconnect();
}

const rectCache = new WeakMap<Element, { rect: DOMRect; stamp: number }>();
let rectEpoch = 0;
if (typeof window !== "undefined") {
  const bump = () => { rectEpoch++; };
  window.addEventListener("resize", bump, { passive: true });
  window.addEventListener("orientationchange", bump, { passive: true });
}

export function cachedRect(el: Element): DOMRect {
  const hit = rectCache.get(el);
  if (hit && hit.stamp === rectEpoch) return hit.rect;
  const rect = el.getBoundingClientRect();
  rectCache.set(el, { rect, stamp: rectEpoch });
  return rect;
}

export function invalidateRect(el: Element): void { rectCache.delete(el); }

export type WallpaperId = "aurora" | "lagoon" | "dune" | "meadow" | "summit" | "noir";
export type ClockStyle = "tall" | "soft" | "wide";
export type Quality = "auto" | "lite" | "full";

export type FlowPrefs = {
  wallpaper: WallpaperId;
  hue: number;
  blur: number;
  glass: number;
  brightness: number;
  grain: number;
  speed: number;
  depth: number;
  radius: number;
  clock: ClockStyle;
  quality: Quality;
  reduce: boolean;
  haptic: boolean;
  sound: boolean;
  lock: boolean;
};

type Pal = { w0: string; w1: string; o1: string; o2: string; o3: string; o4: string; o5: string; acc: string; acc2: string };

const PALETTES: Record<WallpaperId, Pal> = {
  aurora: { w0: "#120A2A", w1: "#2A1250", o1: "#7A3CFF", o2: "#E8437F", o3: "#FF6A3D", o4: "#FFB020", o5: "#3B2A7A", acc: "#FFB020", acc2: "#FF6A3D" },
  lagoon: { w0: "#04121C", w1: "#062A38", o1: "#0FB5C9", o2: "#35D6E8", o3: "#1E6FA8", o4: "#E8D5B5", o5: "#0A4A5C", acc: "#35D6E8", acc2: "#0FB5C9" },
  dune:   { w0: "#1A0F0A", w1: "#3A2018", o1: "#FFB020", o2: "#FF6A3D", o3: "#E8A87C", o4: "#FFD79A", o5: "#6B3A2A", acc: "#FFB020", acc2: "#FF6A3D" },
  meadow: { w0: "#06140A", w1: "#0C2A14", o1: "#7BE04A", o2: "#3DDC84", o3: "#1FA86B", o4: "#C9E86A", o5: "#0A4A2C", acc: "#7BE04A", acc2: "#3DDC84" },
  summit: { w0: "#061024", w1: "#0E2A5C", o1: "#4DA3FF", o2: "#8FD4FF", o3: "#DCE9FF", o4: "#B8C9E8", o5: "#1B3A7A", acc: "#8FD4FF", acc2: "#4DA3FF" },
  noir:   { w0: "#08080C", w1: "#16161C", o1: "#E8E8F0", o2: "#9A9AA8", o3: "#4A4A58", o4: "#C9C9D6", o5: "#2A2A34", acc: "#FFFFFF", acc2: "#C9C9D6" }
};

export const WALLPAPERS: Array<{ id: WallpaperId; name: string; swatch: string }> = [
  { id: "aurora", name: "Aurora", swatch: "linear-gradient(135deg,#7A3CFF,#E8437F 46%,#FFB020)" },
  { id: "lagoon", name: "Lagoon", swatch: "linear-gradient(135deg,#0A4A5C,#0FB5C9 52%,#E8D5B5)" },
  { id: "dune", name: "Dune", swatch: "linear-gradient(135deg,#6B3A2A,#FF6A3D 50%,#FFD79A)" },
  { id: "meadow", name: "Meadow", swatch: "linear-gradient(135deg,#0A4A2C,#3DDC84 52%,#C9E86A)" },
  { id: "summit", name: "Summit", swatch: "linear-gradient(135deg,#1B3A7A,#4DA3FF 54%,#EAF4FF)" },
  { id: "noir", name: "Noir", swatch: "linear-gradient(135deg,#16161C,#6E6E7E 55%,#F2F2F6)" }
];

export const DEFAULT_FLOW: FlowPrefs = {
  wallpaper: "aurora", hue: 0, blur: 22, glass: 62, brightness: 86,
  grain: 20, speed: 1, depth: 40, radius: 26, clock: "tall", quality: "auto",
  reduce: false, haptic: true, sound: true, lock: false
};

export const LIMITS = {
  hue: { min: 0, max: 360, step: 2, unit: "°" },
  blur: { min: 0, max: 40, step: 1, unit: "px" },
  glass: { min: 20, max: 100, step: 1, unit: "%" },
  brightness: { min: 40, max: 100, step: 1, unit: "%" },
  grain: { min: 0, max: 100, step: 2, unit: "%" },
  speed: { min: 0.4, max: 2.2, step: 0.05, unit: "×" },
  depth: { min: 0, max: 100, step: 2, unit: "%" },
  radius: { min: 10, max: 40, step: 1, unit: "px" }
} as const;

export type NumKey = keyof typeof LIMITS;

const KEY = "px:flow";
const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));

/* ---- rotasi hue dihitung di JS, bukan filter CSS per-frame ---- */
function toHsl(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  const l = (mx + mn) / 2;
  let h = 0, s = 0;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    if (mx === r) h = ((g - b) / d + (g < b ? 6 : 0));
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [h, s, l];
}
function toHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; } else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
  const f = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${f(r)}${f(g)}${f(b)}`;
}
function shift(hex: string, deg: number): string {
  if (!deg) return hex;
  const [h, s, l] = toHsl(hex);
  return toHex(h + deg, s, l);
}

export function wallVars(p: FlowPrefs): Record<string, string> {
  const base = PALETTES[p.wallpaper] ?? PALETTES.aurora;
  const out: Record<string, string> = {};
  (Object.keys(base) as Array<keyof Pal>).forEach((k) => { out[`--${k}`] = shift(base[k], p.hue); });
  return out;
}

let current: FlowPrefs = { ...DEFAULT_FLOW };
const listeners = new Set<(p: FlowPrefs) => void>();

export function getFlow(): FlowPrefs { return { ...current }; }

export function normalizeFlow(raw: unknown): FlowPrefs {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out: FlowPrefs = { ...DEFAULT_FLOW };
  if (WALLPAPERS.some((w) => w.id === o.wallpaper)) out.wallpaper = o.wallpaper as WallpaperId;
  if (o.clock === "tall" || o.clock === "soft" || o.clock === "wide") out.clock = o.clock;
  if (o.quality === "auto" || o.quality === "lite" || o.quality === "full") out.quality = o.quality;
  (["reduce", "haptic", "sound", "lock"] as const).forEach((k) => {
    if (typeof o[k] === "boolean") out[k] = o[k] as boolean;
  });
  (Object.keys(LIMITS) as NumKey[]).forEach((k) => {
    const v = o[k];
    if (typeof v === "number" && Number.isFinite(v)) out[k] = clamp(v, LIMITS[k].min, LIMITS[k].max);
  });
  return out;
}

export function effectiveQuality(p: FlowPrefs): "lite" | "full" {
  if (p.quality === "lite") return "lite";
  if (p.quality === "full") return "full";
  if (typeof window === "undefined") return "full";
  const nav = navigator as Navigator & { deviceMemory?: number; hardwareConcurrency?: number };
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const small = window.innerWidth < 1024;
  const weak = (nav.deviceMemory !== undefined && nav.deviceMemory <= 4)
    || (nav.hardwareConcurrency !== undefined && nav.hardwareConcurrency <= 4);
  return coarse || small || weak ? "lite" : "full";
}

export function flowVars(p: FlowPrefs): Record<string, string> {
  return {
    "--f-blur": `${p.blur}px`,
    "--f-glass": String(p.glass),
    "--f-dim": String((100 - p.brightness) / 100),
    "--f-grain": String(p.grain / 100),
    "--f-speed": String(p.speed),
    "--f-depth": String(p.depth / 100),
    "--f-radius": `${p.radius}px`,
    ...wallVars(p)
  };
}

export function applyFlow(p: FlowPrefs): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const osCalm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  root.dataset.wall = p.wallpaper;
  root.dataset.clock = p.clock;
  root.dataset.motion = p.reduce || osCalm ? "reduce" : "full";
  root.dataset.quality = effectiveQuality(p);
  Object.entries(flowVars(p)).forEach(([k, v]) => root.style.setProperty(k, v));
}

export function loadFlow(): FlowPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) current = normalizeFlow(JSON.parse(raw));
  } catch { /* abaikan */ }
  applyFlow(current);
  return { ...current };
}

export function setFlow(patch: Partial<FlowPrefs>): FlowPrefs {
  current = normalizeFlow({ ...current, ...patch });
  try { localStorage.setItem(KEY, JSON.stringify(current)); } catch { /* abaikan */ }
  try {
    document.cookie = `px_flow=${encodeURIComponent(JSON.stringify(current))};path=/;max-age=31536000;SameSite=Lax`;
  } catch { /* abaikan */ }
  applyFlow(current);
  listeners.forEach((l) => l({ ...current }));
  return { ...current };
}

export function subscribeFlow(l: (p: FlowPrefs) => void): () => void {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

export function flowCalm(): boolean {
  if (typeof window === "undefined") return true;
  return current.reduce || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function buzz(pattern: number | number[] = 8): void {
  if (!current.haptic || flowCalm()) return;
  try { navigator.vibrate?.(pattern); } catch { /* tidak didukung */ }
}

let audio: AudioContext | null = null;
export function blip(freq = 660, dur = 0.13, peak = 0.028): void {
  if (!current.sound || typeof window === "undefined") return;
  try {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    if (!audio) audio = new Ctor();
    if (audio.state === "suspended") void audio.resume();
    const t = audio.currentTime;
    const osc = audio.createOscillator();
    const g = audio.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.2, t + dur * 0.7);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(audio.destination);
    osc.start(t); osc.stop(t + dur + 0.02);
  } catch { /* abaikan */ }
}

export function randomFlow(): FlowPrefs {
  const w = WALLPAPERS[Math.floor(Math.random() * WALLPAPERS.length)].id;
  const r = (k: NumKey) => {
    const l = LIMITS[k];
    const steps = Math.round((l.max - l.min) / l.step);
    return Number((l.min + Math.floor(Math.random() * (steps + 1)) * l.step).toFixed(2));
  };
  return setFlow({
    wallpaper: w, hue: r("hue"), blur: r("blur"), glass: Math.max(45, r("glass")),
    brightness: Math.max(66, r("brightness")), grain: r("grain"),
    speed: r("speed"), depth: r("depth"), radius: r("radius")
  });
}

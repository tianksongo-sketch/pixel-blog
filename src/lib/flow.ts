export type WallpaperId = "aurora" | "lagoon" | "dune" | "meadow" | "summit" | "noir";
export type ClockStyle = "tall" | "soft" | "wide";

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
  reduce: boolean;
  haptic: boolean;
  sound: boolean;
  lock: boolean;
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
  wallpaper: "aurora", hue: 0, blur: 26, glass: 58, brightness: 84,
  grain: 24, speed: 1, depth: 46, radius: 26, clock: "tall",
  reduce: false, haptic: true, sound: true, lock: false
};

export const LIMITS = {
  hue: { min: 0, max: 360, step: 1, unit: "°" },
  blur: { min: 0, max: 48, step: 1, unit: "px" },
  glass: { min: 10, max: 100, step: 1, unit: "%" },
  brightness: { min: 35, max: 100, step: 1, unit: "%" },
  grain: { min: 0, max: 100, step: 1, unit: "%" },
  speed: { min: 0.4, max: 2.2, step: 0.05, unit: "×" },
  depth: { min: 0, max: 100, step: 1, unit: "%" },
  radius: { min: 10, max: 40, step: 1, unit: "px" }
} as const;

export type NumKey = keyof typeof LIMITS;

const KEY = "px:flow";
const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));

let current: FlowPrefs = { ...DEFAULT_FLOW };
const listeners = new Set<(p: FlowPrefs) => void>();

export function getFlow(): FlowPrefs { return { ...current }; }

export function normalizeFlow(raw: unknown): FlowPrefs {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out: FlowPrefs = { ...DEFAULT_FLOW };
  if (WALLPAPERS.some((w) => w.id === o.wallpaper)) out.wallpaper = o.wallpaper as WallpaperId;
  if (o.clock === "tall" || o.clock === "soft" || o.clock === "wide") out.clock = o.clock;
  (["reduce", "haptic", "sound", "lock"] as const).forEach((k) => {
    if (typeof o[k] === "boolean") out[k] = o[k] as boolean;
  });
  (Object.keys(LIMITS) as NumKey[]).forEach((k) => {
    const v = o[k];
    if (typeof v === "number" && Number.isFinite(v)) out[k] = clamp(v, LIMITS[k].min, LIMITS[k].max);
  });
  return out;
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
    "--f-hue": `${p.hue}deg`
  };
}

export function applyFlow(p: FlowPrefs): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const osCalm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  root.dataset.wall = p.wallpaper;
  root.dataset.clock = p.clock;
  root.dataset.motion = p.reduce || osCalm ? "reduce" : "full";
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
export function blip(freq = 660, dur = 0.14, gainPeak = 0.03): void {
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
    osc.frequency.exponentialRampToValueAtTime(freq * 1.22, t + dur * 0.7);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gainPeak, t + 0.01);
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
    wallpaper: w, hue: r("hue"), blur: r("blur"), glass: r("glass"),
    brightness: Math.max(62, r("brightness")), grain: r("grain"),
    speed: r("speed"), depth: r("depth"), radius: r("radius")
  });
}

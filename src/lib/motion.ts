export type MotionPrefs = {
  lebay: boolean;
  reduce: boolean;
  haptic: boolean;
  sound: boolean;
};

export const DEFAULT_MOTION: MotionPrefs = { lebay: false, reduce: false, haptic: true, sound: false };

const KEY = "px:motion";
type Listener = (p: MotionPrefs) => void;
const listeners = new Set<Listener>();
let current: MotionPrefs = { ...DEFAULT_MOTION };

export function getMotion(): MotionPrefs { return { ...current }; }

export function applyMotion(p: MotionPrefs): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const osReduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const calm = p.reduce || osReduce;
  root.dataset.lebay = p.lebay && !calm ? "on" : "off";
  root.dataset.motion = calm ? "reduce" : "full";
  root.style.setProperty("--mo", calm ? "0" : p.lebay ? "2" : "1");
}

export function loadMotion(): MotionPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) current = { ...DEFAULT_MOTION, ...(JSON.parse(raw) as Partial<MotionPrefs>) };
  } catch { /* abaikan */ }
  applyMotion(current);
  return { ...current };
}

export function setMotion(patch: Partial<MotionPrefs>): MotionPrefs {
  current = { ...current, ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(current)); } catch { /* abaikan */ }
  try { document.cookie = `px_motion=${encodeURIComponent(JSON.stringify(current))};path=/;max-age=31536000;SameSite=Lax`; } catch { /* abaikan */ }
  applyMotion(current);
  listeners.forEach((l) => l({ ...current }));
  return { ...current };
}

export function subscribeMotion(l: Listener): () => void {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

export function calmNow(): boolean {
  if (typeof window === "undefined") return true;
  return current.reduce || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function haptic(pattern: number | number[] = 8): void {
  if (!current.haptic || calmNow()) return;
  try { navigator.vibrate?.(pattern); } catch { /* tidak didukung */ }
}

let ctx: AudioContext | null = null;
export function tick(freq = 660): void {
  if (!current.sound) return;
  try {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    if (!ctx) ctx = new Ctor();
    if (ctx.state === "suspended") void ctx.resume();
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "triangle";
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.035, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    o.connect(g).connect(ctx.destination);
    o.start(t); o.stop(t + 0.18);
  } catch { /* abaikan */ }
}

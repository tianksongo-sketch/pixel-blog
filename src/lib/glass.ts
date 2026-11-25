export type GlassSettings = {
  on: boolean;
  tone: "dark" | "light";
  blur: number;
  tint: number;
  saturation: number;
  specular: number;
  refraction: number;
  grain: number;
  glow: number;
  radius: number;
  speed: number;
  depth: number;
  hue: number;
  sound: boolean;
};

export const DEFAULT_GLASS: GlassSettings = {
  on: true, tone: "dark",
  blur: 22, tint: 16, saturation: 165, specular: 62,
  refraction: 48, grain: 26, glow: 72, radius: 26,
  speed: 1, depth: 46, hue: 0, sound: false
};

export const PRESETS: Array<{ id: string; label: string; icon: string; patch: Partial<GlassSettings> }> = [
  { id: "ios", label: "iOS 27", icon: "blur_on", patch: { tone: "dark", blur: 26, tint: 14, saturation: 180, specular: 74, refraction: 62, grain: 18, glow: 78, radius: 30, speed: 0.9, depth: 52, hue: 0 } },
  { id: "coloros", label: "ColorOS 17", icon: "water_drop", patch: { tone: "dark", blur: 18, tint: 22, saturation: 205, specular: 54, refraction: 40, grain: 34, glow: 88, radius: 22, speed: 1.25, depth: 62, hue: 128 } },
  { id: "obsidian", label: "Obsidian", icon: "dark_mode", patch: { tone: "dark", blur: 30, tint: 9, saturation: 130, specular: 88, refraction: 78, grain: 12, glow: 46, radius: 34, speed: 0.65, depth: 34, hue: 268 } },
  { id: "milk", label: "Frosted Milk", icon: "light_mode", patch: { tone: "light", blur: 24, tint: 46, saturation: 150, specular: 70, refraction: 34, grain: 22, glow: 60, radius: 28, speed: 0.85, depth: 40, hue: 32 } }
];

export const LIMITS: Record<string, { min: number; max: number; step: number; unit: string }> = {
  blur: { min: 0, max: 44, step: 1, unit: "px" },
  tint: { min: 0, max: 60, step: 1, unit: "%" },
  saturation: { min: 100, max: 240, step: 5, unit: "%" },
  specular: { min: 0, max: 100, step: 1, unit: "%" },
  refraction: { min: 0, max: 100, step: 1, unit: "%" },
  grain: { min: 0, max: 100, step: 1, unit: "%" },
  glow: { min: 0, max: 100, step: 1, unit: "%" },
  radius: { min: 6, max: 44, step: 1, unit: "px" },
  speed: { min: 0.2, max: 2.4, step: 0.05, unit: "×" },
  depth: { min: 0, max: 100, step: 1, unit: "%" },
  hue: { min: 0, max: 360, step: 1, unit: "°" }
};

const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));

export function normalize(raw: unknown): GlassSettings {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out: GlassSettings = { ...DEFAULT_GLASS };
  (Object.keys(DEFAULT_GLASS) as Array<keyof GlassSettings>).forEach((k) => {
    const v = o[k];
    if (k === "on" || k === "sound") { if (typeof v === "boolean") (out[k] as boolean) = v; return; }
    if (k === "tone") { if (v === "light" || v === "dark") out.tone = v; return; }
    const lim = LIMITS[k];
    if (lim && typeof v === "number" && Number.isFinite(v)) (out[k] as number) = clamp(v, lim.min, lim.max);
  });
  return out;
}

export function glassVars(s: GlassSettings): Record<string, string> {
  return {
    "--gl-blur": `${s.blur}px`,
    "--gl-tint": `${s.tint / 100}`,
    "--gl-sat": `${s.saturation}%`,
    "--gl-spec": `${s.specular / 100}`,
    "--gl-refract": `${s.refraction / 100}`,
    "--gl-grain": `${s.grain / 100}`,
    "--gl-glow": `${s.glow / 100}`,
    "--gl-radius": `${s.radius}px`,
    "--gl-speed": `${s.speed}`,
    "--gl-depth": `${s.depth / 100}`,
    "--gl-hue": `${s.hue}deg`
  };
}

export function applyGlass(s: GlassSettings): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.glass = s.on ? "on" : "off";
  root.dataset.glassTone = s.tone;
  Object.entries(glassVars(s)).forEach(([k, v]) => root.style.setProperty(k, v));
}

export const STORAGE_KEY = "px:glass";

export function loadGlass(): GlassSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_GLASS };
    return normalize(JSON.parse(raw));
  } catch { return { ...DEFAULT_GLASS }; }
}

export function saveGlass(s: GlassSettings): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* abaikan */ }
  try { document.cookie = `px_glass=${encodeURIComponent(JSON.stringify(s))};path=/;max-age=31536000;SameSite=Lax`; } catch { /* abaikan */ }
}

export function randomGlass(current: GlassSettings): GlassSettings {
  const r = (k: keyof typeof LIMITS) => {
    const l = LIMITS[k];
    const steps = Math.round((l.max - l.min) / l.step);
    return Number((l.min + Math.floor(Math.random() * (steps + 1)) * l.step).toFixed(2));
  };
  return {
    ...current, on: true,
    tone: Math.random() > 0.72 ? "light" : "dark",
    blur: r("blur"), tint: r("tint"), saturation: r("saturation"),
    specular: r("specular"), refraction: r("refraction"), grain: r("grain"),
    glow: r("glow"), radius: r("radius"), speed: r("speed"), depth: r("depth"), hue: r("hue")
  };
}

export function glassCss(s: GlassSettings): string {
  const vars = glassVars(s);
  return `:root[data-glass="on"]{\n${Object.entries(vars).map(([k, v]) => `  ${k}: ${v};`).join("\n")}\n}`;
}
